#!/usr/bin/env python3
"""Run a version-matched, temporary k6 container; keep fixture files private."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

CLIENT_ROOT = Path("/opt/anfragepilot/runtime/capacity-clients")


def docker(*arguments, capture=False):
    return subprocess.run(["docker", *arguments], check=True, text=True,
                          stdout=subprocess.PIPE if capture else None, timeout=600)


def owned_file(path):
    if path.is_symlink() or not path.is_file() or path.stat().st_uid != os.getuid():
        raise RuntimeError("Unsafe client file")
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "run", "cleanup"])
    parser.add_argument("run_id", type=lambda value: str(uuid.UUID(value)))
    parser.add_argument("--version", type=lambda value: value if re.fullmatch(r"\d+\.\d+\.\d+", value)
                        else parser.error("Expected a release version"))
    parser.add_argument("--rps", type=int, choices=[5, 10, 20], default=5)
    args = parser.parse_args()
    directory = CLIENT_ROOT / args.run_id
    state_path = directory / "state.json"
    fixture_path = directory / "fixture.json"
    name = "varnito-capacity-client-" + args.run_id

    if args.action == "prepare":
        if not args.version:
            raise RuntimeError("Release version required")
        tag = "grafana/k6:" + args.version
        docker("pull", tag)
        image = docker("image", "inspect", "--format", "{{.Id}}", tag, capture=True).stdout.strip()
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", image):
            raise RuntimeError("Unexpected client image ID")
        directory.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        if directory.parent.is_symlink() or directory.parent.stat().st_uid != os.getuid():
            raise RuntimeError("Unsafe client directory")
        os.chmod(directory.parent, 0o700)
        directory.mkdir(mode=0o700)
        with open(state_path, "x", opener=lambda path, flags: os.open(path, flags, 0o600)) as file:
            json.dump({"run_id": args.run_id, "image": image, "version": args.version}, file)
        print("Prepared temporary k6 client " + args.version)
        return

    if not directory.exists() and args.action == "cleanup":
        print("Temporary client already removed")
        return
    if directory.is_symlink() or directory.stat().st_uid != os.getuid():
        raise RuntimeError("Unsafe client directory")
    state = json.loads(owned_file(state_path).read_text())
    if state.get("run_id") != args.run_id or not re.fullmatch(r"sha256:[0-9a-f]{64}", state.get("image", "")):
        raise RuntimeError("Unexpected client state")

    if args.action == "run":
        owned_file(fixture_path)
        script = Path(__file__).resolve().parents[2] / "load-tests" / "dashboard-sustained.js"
        arguments = ["docker", "run", "--rm", "--pull=never", "--name", name,
                     "--label", "varnito.capacity_run=" + args.run_id,
                     "--network", "host", "--user", f"{os.getuid()}:{os.getgid()}",
                     "--read-only", "--cap-drop=ALL", "--security-opt", "no-new-privileges",
                     "--memory", "2g", "--memory-swap", "2g",
                     "--mount", f"type=bind,src={fixture_path},dst=/fixture.json,readonly",
                     "--mount", f"type=bind,src={script},dst=/dashboard-sustained.js,readonly",
                     "--env", "K6_NO_USAGE_REPORT=true", state["image"], "run",
                     "--env", "FIXTURE_PATH=/fixture.json", "--env", f"CAPACITY_RPS={args.rps}",
                     "--env", "CAPACITY_RUNNER=vps", "/dashboard-sustained.js"]
        print("Runner: VPS; k6 " + state["version"] + "; public HTTPS through Caddy", flush=True)
        result = subprocess.run(arguments, timeout=600)
        sys.exit(result.returncode)

    if any(path.name not in {"fixture.json", "state.json"} for path in directory.iterdir()):
        raise RuntimeError("Refusing to remove a client directory with unknown files")
    names = docker("ps", "-a", "--filter", "name=" + name, "--format", "{{.Names}}", capture=True).stdout.splitlines()
    if name in names:
        container = json.loads(docker("inspect", name, capture=True).stdout)[0]
        if (container.get("Config", {}).get("Labels", {}).get("varnito.capacity_run") != args.run_id
                or container.get("Image") != state["image"]):
            raise RuntimeError("Refusing to remove a client with mismatched run label")
        docker("rm", "-f", name)
    for path in [fixture_path, state_path]:
        if path.exists() or path.is_symlink():
            owned_file(path).unlink()
    directory.rmdir()
    print("Temporary client and private fixture copy removed")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Capacity client failed: " + (str(error) if isinstance(error, RuntimeError)
              else type(error).__name__), file=sys.stderr)
        sys.exit(1)
