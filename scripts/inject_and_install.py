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
    proc = subprocess.run(cmd, **kwargs)
    return proc.returncode, proc.stdout, proc.stderr

def inject_js(cwd: Path, libs):
    pkgfile = cwd / 'package.json'
    if not pkgfile.exists():
        print('package.json not found; aborting JS injection')
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
        print('Updated package.json with:', libs)
    else:
        print('No JS deps to add')
    print('Running npm install...')
    code, out, err = run(['npm', 'install'], cwd=cwd)
    print(out)
    if code != 0:
        print('npm install failed:', err)
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
        print('Appended to requirements.txt:', added)
    else:
        print('No Python deps to add')
    python = sys.executable or 'python'
    cmd = [python, '-m', 'pip', 'install', '-r', str(req)]
    print('Running:', ' '.join(cmd))
    code, out, err = run(cmd, cwd=cwd)
    print(out)
    if code != 0:
        print('pip install failed:', err)
    return code

def git_commit_push(cwd: Path, msg: str):
    print('Staging changes...')
    run(['git', 'add', '-A'], cwd=cwd)
    rc, out, err = run(['git', 'diff', '--cached', '--name-only'], cwd=cwd)
    if rc != 0:
        print('git diff failed', err)
        return rc
    if not out.strip():
        print('No changes to commit')
        return 0
    print('Committing...')
    rc, out, err = run(['git', 'commit', '-m', msg], cwd=cwd)
    if rc != 0:
        print('git commit failed:', err)
        return rc
    print('Pushing...')
    rc, out, err = run(['git', 'push'], cwd=cwd)
    if rc != 0:
        print('git push failed:', err)
    return rc

def main():
    cwd = Path(os.getcwd())
    lang = detect_language(cwd)
    if not lang:
        print('No recognizable project files (package.json / requirements.txt / pyproject.toml)')
        return 2

    libs = []
    if pyconfig:
        libs = pyconfig.JS_LIBS if lang == 'js' else pyconfig.PY_LIBS
    else:
        print('pyjs.config not importable; falling back to defaults')
        libs = ['requests'] if lang == 'py' else []

    print('Detected language:', lang)
    code = 0
    if lang == 'js':
        code = inject_js(cwd, libs)
    else:
        code = inject_py(cwd, libs)

    try:
        msg = getattr(pyconfig, 'COMMIT_MESSAGE', 'deps: add from config') if pyconfig else 'deps: add from config'
        git_commit_push(cwd, msg)
    except Exception as e:
        print('Git step failed:', e)

    return code

if __name__ == '__main__':
    rc = main()
    sys.exit(rc)
