#!/usr/bin/env python3
"""Create and remove a bounded fixture using credentials inside the running app."""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import uuid


def manifest(run_id):
    companies = []
    for number in range(1, 6):
        marker = f"Capacity-{run_id}-C{number}"
        companies.append({
            "id": str(uuid.uuid4()), "marker": marker,
            "users": [{"id": str(uuid.uuid4()),
                       "email": f"capacity-{run_id}-c{number}-u{member}@example.com",
                       "role": "owner" if member == 0 else "member"}
                      for member in range(10)],
            "leads": [str(uuid.uuid4()) for _ in range(500)],
        })
    return {"version": 1, "run_id": run_id, "companies": companies}


def execute(action, ledger, password=None):
    worker = Path(__file__).with_name("capacity-fixture.mjs").read_text()
    payload = {"action": action, "ledger": ledger, "password": password}
    if action == "seed":
        names = ["anfragepilot-app", "anfragepilot-app-2", "anfragepilot-app-3", "anfragepilot-app-4"]
        inspected = subprocess.run(["docker", "inspect", *names], text=True,
                                   capture_output=True, timeout=30)
        if inspected.returncode:
            raise RuntimeError("Four running containers are required")
        containers = json.loads(inspected.stdout)
        primary = containers[0]
        networks = primary["NetworkSettings"]["Networks"]
        payload["replicas"] = []
        for container in containers:
            if (container["State"].get("Health", {}).get("Status") != "healthy" or
                    container["Image"] != primary["Image"] or
                    sorted(container["Config"]["Env"]) != sorted(primary["Config"]["Env"])):
                raise RuntimeError("Healthy containers with matching images and environments required")
            shared = set(networks) & set(container["NetworkSettings"]["Networks"])
            if not shared:
                raise RuntimeError("Containers must share a Docker network")
            address = container["NetworkSettings"]["Networks"][sorted(shared)[0]]["IPAddress"]
            ipaddress.IPv4Address(address)
            payload["replicas"].append({"name": container["Name"].lstrip("/"),
                                        "url": f"http://{address}:3000/dashboard/leads"})
    source = "globalThis.capacityInput = " + json.dumps(payload) + ";\n" + worker
    result = subprocess.run(
        ["docker", "exec", "-i", "anfragepilot-app", "node", "--input-type=module", "-"],
        input=source, text=True, capture_output=True, timeout=600,
    )
    if result.returncode:
        # Only the worker's deliberately sanitized errors may reach the terminal.
        safe = [line for line in result.stderr.splitlines()
                if line.startswith("Capacity fixture error:")]
        raise RuntimeError(safe[-1] if safe else "Capacity fixture worker failed")
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["seed", "cleanup"])
    parser.add_argument("run_id", type=lambda value: str(uuid.UUID(value)))
    args = parser.parse_args()
    app_dir = Path(os.environ.get("VARNITO_APP_DIR", "/opt/anfragepilot/app"))
    directory = app_dir.parent / "runtime" / "capacity-fixtures"
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if directory.is_symlink() or directory.stat().st_uid != os.getuid():
        raise RuntimeError("Unsafe fixture ledger directory")
    os.chmod(directory, 0o700)
    path = directory / f"{args.run_id}.json"
    if args.action == "seed":
        ledger = manifest(args.run_id)
        # Persist every planned ID before the first mutation, including partial failures.
        with open(path, "x", opener=lambda name, flags: os.open(name, flags, 0o600)) as file:
            json.dump(ledger, file)
            file.flush()
            os.fsync(file.fileno())
        result = execute("seed", ledger, "Aa1!" + secrets.token_urlsafe(32))
    else:
        if path.is_symlink() or path.stat().st_uid != os.getuid():
            raise RuntimeError("Unsafe fixture ledger file")
        ledger = json.loads(path.read_text())
        if ledger.get("run_id") != args.run_id or ledger.get("version") != 1:
            raise RuntimeError("Unexpected fixture ledger")
        result = execute(args.action, ledger)
        if args.action == "cleanup":
            path.unlink()
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error) if isinstance(error, RuntimeError)
              else f"Fixture operation failed ({type(error).__name__}); ledger retained", file=sys.stderr)
        sys.exit(1)
