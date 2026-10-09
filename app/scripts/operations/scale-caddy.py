#!/usr/bin/env python3
"""Switch the reviewed Varnito Caddy block, with validation and guarded rollback."""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import urllib.request
import uuid

CONFIG = Path('/etc/caddy/Caddyfile')
STATE_DIR = Path('/var/lib/varnito-scale')
STATE = STATE_DIR / 'state.json'
ORIGINAL = '''varnito.de, varnito.com {
    reverse_proxy 127.0.0.1:3000
}'''
SCALED = '''varnito.de, varnito.com {
    reverse_proxy 127.0.0.1:3000 127.0.0.1:3001 127.0.0.1:3002 127.0.0.1:3003 {
        lb_policy least_conn
        health_uri /api/health
        health_interval 10s
        health_timeout 3s
        fail_duration 10s
        max_fails 2
        unhealthy_status 5xx
    }
}'''
REPLICAS = {'127.0.0.1:3001', '127.0.0.1:3002', '127.0.0.1:3003'}


def digest(content):
    return hashlib.sha256(content).hexdigest()


def transformed(content):
    original, scaled = ORIGINAL.encode(), SCALED.encode()
    pattern = re.compile(rb'(?m)^' + re.escape(original) + rb'(?=$)')
    if len(list(pattern.finditer(content))) != 1 or scaled in content:
        raise RuntimeError('Caddy block differs from the reviewed configuration; refusing rewrite.')
    return pattern.sub(lambda _: scaled, content, count=1)


def upstreams():
    with urllib.request.urlopen('http://127.0.0.1:2019/reverse_proxy/upstreams', timeout=10) as response:
        return {row['address'] for row in json.load(response)}


def check_containers():
    expected = None
    expected_env = None
    for name in ('anfragepilot-app', 'anfragepilot-app-2', 'anfragepilot-app-3', 'anfragepilot-app-4'):
        output = subprocess.check_output(
            ['docker', 'inspect', '--format', '{{.Image}} {{.State.Health.Status}}', name], text=True
        ).strip().split()
        if len(output) != 2 or output[1] != 'healthy':
            raise RuntimeError('Container must be healthy: ' + name)
        expected = expected or output[0]
        if output[0] != expected:
            raise RuntimeError('All containers must run the same immutable image.')
        environment = subprocess.check_output(
            ['docker', 'inspect', '--format', '{{json .Config.Env}}', name], text=True
        )
        environment_hash = digest(json.dumps(sorted(json.loads(environment))).encode())
        expected_env = expected_env or environment_hash
        if environment_hash != expected_env:
            raise RuntimeError('All containers must use the same environment; values not printed.')


def atomic_write(path, content, metadata=None):
    fd, temporary = tempfile.mkstemp(prefix=path.name + '.', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        if metadata is not None:
            os.chmod(temporary, stat.S_IMODE(metadata.st_mode))
            os.chown(temporary, metadata.st_uid, metadata.st_gid)
        else:
            os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def validate(content):
    fd, temporary = tempfile.mkstemp(prefix='Caddyfile.varnito-check.', dir=CONFIG.parent)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(content)
        subprocess.run(['/usr/bin/caddy', 'validate', '--config', temporary, '--adapter', 'caddyfile'], check=True)
    finally:
        os.unlink(temporary)


def reload_caddy():
    subprocess.run(['/usr/bin/caddy', 'reload', '--config', str(CONFIG), '--adapter', 'caddyfile'], check=True)


def activate():
    check_containers()
    before = upstreams()
    if REPLICAS & before:
        raise RuntimeError('Replica routes already exist; refusing another activation.')
    if CONFIG.is_symlink():
        raise RuntimeError('Caddyfile symlink requires manual review.')
    original = CONFIG.read_bytes()
    candidate = transformed(original)
    validate(candidate)
    metadata = CONFIG.stat()
    STATE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(STATE_DIR, 0o700)
    backup = STATE_DIR / ('Caddyfile.before-' + str(uuid.uuid4()))
    atomic_write(backup, original)
    record = {'backup': str(backup), 'original_sha256': digest(original), 'scaled_sha256': digest(candidate)}
    # Persist recovery information before replacing the live configuration.
    atomic_write(STATE, json.dumps(record).encode())
    atomic_write(CONFIG, candidate, metadata)
    try:
        reload_caddy()
        if upstreams() != before | REPLICAS:
            raise RuntimeError('Loaded upstreams do not match the reviewed change.')
    except Exception:
        atomic_write(CONFIG, original, metadata)
        reload_caddy()
        raise
    print('Varnito load balancing enabled; backup: ' + str(backup))


def rollback():
    record = json.loads(STATE.read_text())
    backup = Path(record['backup'])
    if backup.parent != STATE_DIR:
        raise RuntimeError('Unexpected backup path.')
    current = CONFIG.read_bytes()
    if digest(current) != record['scaled_sha256']:
        raise RuntimeError('Caddyfile changed after activation; refusing to overwrite other changes.')
    original = backup.read_bytes()
    if digest(original) != record['original_sha256']:
        raise RuntimeError('Backup integrity check failed.')
    before = upstreams()
    validate(original)
    metadata = CONFIG.stat()
    atomic_write(CONFIG, original, metadata)
    try:
        reload_caddy()
        if upstreams() != before - REPLICAS:
            raise RuntimeError('Rollback upstream verification failed.')
    except Exception:
        atomic_write(CONFIG, current, metadata)
        reload_caddy()
        raise
    print('Varnito restored to the original single-instance configuration.')


if __name__ == '__main__':
    try:
        if os.geteuid() != 0:
            raise RuntimeError('Run with sudo; do not send the sudo password in chat.')
        if len(sys.argv) != 2 or sys.argv[1] not in ('activate', 'rollback'):
            raise RuntimeError('Usage: scale-caddy.py activate|rollback')
        (activate if sys.argv[1] == 'activate' else rollback)()
    except Exception as error:
        print('Caddy scaling failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
