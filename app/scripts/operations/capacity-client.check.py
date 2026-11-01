import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import uuid

spec = importlib.util.spec_from_file_location("capacity_client", Path(__file__).with_name("capacity-client.py"))
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)


class ClientChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "clients"
        self.run_id = str(uuid.uuid4())
        self.image = "sha256:" + "a" * 64
        self.name = "varnito-capacity-client-" + self.run_id
        self.calls = []
        self.label = self.run_id

    def docker(self, *arguments, **kwargs):
        self.calls.append(arguments)
        output = ""
        if arguments[:2] == ("image", "inspect"):
            output = self.image + "\n"
        if arguments[0] == "ps":
            output = self.name + "\n"
        if arguments[0] == "inspect":
            output = json.dumps([{"Image": self.image, "Config": {"Labels": {"varnito.capacity_run": self.label}}}])
        return subprocess.CompletedProcess(arguments, 0, stdout=output)

    def invoke(self, action, *arguments):
        with patch.object(client, "CLIENT_ROOT", self.root), patch.object(client, "docker", side_effect=self.docker), \
                patch.object(sys, "argv", ["client", action, self.run_id, *arguments]):
            client.main()

    def prepare(self):
        self.invoke("prepare", "--version", "2.3.0")
        self.directory = self.root / self.run_id
        self.fixture = self.directory / "fixture.json"
        self.fixture.write_text("{}")

    def test_private_state_and_exact_cleanup(self):
        self.prepare()
        self.assertEqual(self.directory.stat().st_mode & 0o777, 0o700)
        self.assertEqual((self.directory / "state.json").stat().st_mode & 0o777, 0o600)
        self.invoke("cleanup")
        self.assertFalse(self.directory.exists())
        self.assertIn(("rm", "-f", self.name), self.calls)

    def test_mismatched_label_refuses_cleanup(self):
        self.prepare()
        self.label = "foreign"
        with self.assertRaisesRegex(RuntimeError, "mismatched"):
            self.invoke("cleanup")
        self.assertTrue(self.fixture.exists())
        self.assertFalse(any(call[0] == "rm" for call in self.calls))

    def test_unknown_file_refuses_cleanup_before_any_deletion(self):
        self.prepare()
        (self.directory / "customer-data").write_text("keep")
        with self.assertRaisesRegex(RuntimeError, "unknown files"):
            self.invoke("cleanup")
        self.assertTrue(self.fixture.exists())
        self.assertTrue((self.directory / "state.json").exists())
        self.assertFalse(any(call[0] == "rm" for call in self.calls))

    def test_run_pins_image_and_propagates_k6_threshold_exit(self):
        self.prepare()
        with patch.object(client.subprocess, "run", return_value=subprocess.CompletedProcess([], 99)) as run:
            with self.assertRaises(SystemExit) as result:
                self.invoke("run", "--rps", "5")
        self.assertEqual(result.exception.code, 99)
        arguments = run.call_args.args[0]
        self.assertIn(self.image, arguments)
        self.assertNotIn("grafana/k6:2.3.0", arguments)
        self.assertEqual(arguments[arguments.index("--user") + 1], f"{os.getuid()}:{os.getgid()}")
        self.assertEqual(arguments[arguments.index("--network") + 1], "host")
        self.assertIn("CAPACITY_RPS=5", arguments)
        self.assertIn("CAPACITY_RUNNER=vps", arguments)


if __name__ == "__main__":
    unittest.main()
