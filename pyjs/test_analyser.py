"""Port of `test-analyser.js` to Python for basic sanity checks."""
import subprocess
import time
from pathlib import Path


def test_analyser():
    try:
        analyser_path = Path(__file__).resolve().parents[1] / 'assets' / 'analyser.exe'
        p = subprocess.Popen([str(analyser_path)], creationflags=0x00000008, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(5)
        subprocess.run('schtasks /Query /TN "TestAppStartup" /FO LIST', shell=True, check=False)
    except Exception:
        raise


if __name__ == '__main__':
    test_analyser()
