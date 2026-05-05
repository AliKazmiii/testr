"""Utility helpers ported from `utils.js`."""
from pathlib import Path
import subprocess
import json
import logging
import sys
import re
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from .config import EXCLUDED_NAMES, EXCLUDED_PATTERNS
except Exception:
    EXCLUDED_NAMES = ['program8x', 'node_modules', '__pycache__', '.env', 'dist', 'build', '.git']
    EXCLUDED_PATTERNS = ['.DS_Store', 'Thumbs.db']


def run_silent(command: str, cwd: Optional[str] = None) -> None:
    logger.debug("run_silent: %s (cwd=%s)", command, cwd)
    try:
        startupinfo = None
        creationflags = 0
        if sys.platform == 'win32' and hasattr(subprocess, 'STARTUPINFO'):
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 0
            creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)

        args = None
        pip_match = re.fullmatch(r'python -m pip install -r "(.+)"', command)
        if pip_match:
            args = [sys.executable, '-m', 'pip', 'install', '-r', pip_match.group(1)]
        elif command == 'npm install':
            args = ['cmd', '/c', 'npm', 'install']
        elif command == 'git add .':
            args = ['git', 'add', '.']
        elif command == 'git push':
            args = ['git', 'push']
        else:
            commit_match = re.fullmatch(r'git commit -m "(.+)"', command)
            if commit_match:
                args = ['git', 'commit', '-m', commit_match.group(1)]

        if args is not None:
            subprocess.run(
                args,
                cwd=cwd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                startupinfo=startupinfo,
                creationflags=creationflags,
            )
        else:
            subprocess.run(
                command,
                cwd=cwd,
                shell=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                startupinfo=startupinfo,
                creationflags=creationflags,
            )
    except Exception as e:
        logger.debug("run_silent failed: %s", e)


def is_excluded(full_path: str, name: str) -> bool:
    if name in EXCLUDED_NAMES:
        return True
    return any(pattern in full_path for pattern in EXCLUDED_PATTERNS)


def read_file(file_path: str) -> str:
    p = Path(file_path)
    if not p.exists():
        return ""
    data = p.read_text(encoding='utf-8')
    if data and ord(data[0]) == 0xFEFF:
        return data[1:]
    logger.debug("read_file %s (len=%d)", file_path, len(data))
    return data


def write_file(file_path: str, content: str) -> None:
    p = Path(file_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')
    logger.debug("write_file %s (len=%d)", file_path, len(content))


def append_to_file(file_path: str, line: str) -> None:
    current = read_file(file_path)
    new_content = current.rstrip('\n') + '\n' + line + '\n'
    write_file(file_path, new_content)
    logger.info("Appended line to %s: %s", file_path, line)


def add_to_package_json(package_json_path: str, package_name: str, version: str = '*') -> None:
    p = Path(package_json_path)
    if not p.exists():
        return
    try:
        pkg = json.loads(p.read_text(encoding='utf-8'))
    except Exception:
        return
    if not isinstance(pkg.get('dependencies'), dict):
        pkg['dependencies'] = {}
    pkg['dependencies'][package_name] = version
    p.write_text(json.dumps(pkg, indent=2), encoding='utf-8')
    logger.info("Added dependency %s@%s to %s", package_name, version, package_json_path)
