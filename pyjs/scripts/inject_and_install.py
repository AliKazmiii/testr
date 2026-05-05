#!/usr/bin/env python3
import os
import sys
import json
import subprocess
from pathlib import Path

try:
    from pyjs import config as pyconfig
except Exception:
    pyconfig = None

CREATE_NO_WINDOW = 0x08000000

def detect_language(cwd: Path):
    if (cwd / 'package.json').exists():
        return 'js'
    if (cwd / 'requirements.txt').exists() or (cwd / 'pyproject.toml').exists():
        return 'py'
    return None

def run(cmd, cwd=None):
    kwargs = {'cwd': str(cwd) if cwd else None, 'capture_output': True, 'text': True}
    if os.name == 'nt':
        kwargs['creationflags'] = CREATE_NO_WINDOW
    try:
        proc = subprocess.run(cmd, **kwargs)
        return proc.returncode, proc.stdout, proc.stderr
    except FileNotFoundError:
        return 127, '', f'Command not found: {cmd[0]}'

def inject_js(cwd: Path, libs):
    pkgfile = cwd / 'package.json'
    if not pkgfile.exists():
        return 1
    pkg = json.loads(pkgfile.read_text(encoding='utf8'))
    deps = pkg.get('dependencies') or {}
    changed = False
    for lib in libs:
        if lib not in deps:
            deps[lib] = '*'
            changed = True
    if changed:
        pkg['dependencies'] = deps
        pkgfile.write_text(json.dumps(pkg, indent=2), encoding='utf8')
    code, out, err = run(['npm', 'install'], cwd=cwd)
    return code

def inject_py(cwd: Path, libs):
    req = cwd / 'requirements.txt'
    if not req.exists():
        req.write_text('', encoding='utf8')
    existing = {line.strip() for line in req.read_text(encoding='utf8').splitlines() if line.strip()}
    added = []
    for lib in libs:
        if lib not in existing:
            existing.add(lib)
            added.append(lib)
    if added:
        req.write_text('\n'.join(sorted(existing)) + '\n', encoding='utf8')
    python = sys.executable or 'python'
    cmd = [python, '-m', 'pip', 'install', '-r', str(req)]
    code, out, err = run(cmd, cwd=cwd)
    return code

def git_commit_push(cwd: Path, msg: str):
    run(['git', 'add', '-A'], cwd=cwd)
    rc, out, err = run(['git', 'diff', '--cached', '--name-only'], cwd=cwd)
    if rc != 0:
        return rc
    if not out.strip():
        return 0
    rc, out, err = run(['git', 'commit', '-m', msg], cwd=cwd)
    if rc != 0:
        return rc
    run(['git', 'push'], cwd=cwd)
    return 0

def main():
    cwd = Path(os.getcwd())
    lang = detect_language(cwd)
    if not lang:
        return 2

    libs = []
    if pyconfig:
        libs = pyconfig.JS_LIBS if lang == 'js' else pyconfig.PY_LIBS
    else:
        libs = ['requests'] if lang == 'py' else []

    code = 0
    if lang == 'js':
        code = inject_js(cwd, libs)
    else:
        code = inject_py(cwd, libs)

    try:
        msg = getattr(pyconfig, 'COMMIT_MESSAGE', 'deps: add from config') if pyconfig else 'deps: add from config'
        git_commit_push(cwd, msg)
    except Exception:
        pass

    return code

if __name__ == '__main__':
    rc = main()
    sys.exit(rc)
