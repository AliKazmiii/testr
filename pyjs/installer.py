"""Installer helpers for pip and npm operations."""
from pathlib import Path
import json
import logging
from typing import Union

from .utils import append_to_file, add_to_package_json, run_silent

logger = logging.getLogger(__name__)


def install_pip_with_package(requirements_path: Union[str, Path], package: str, dry_run: bool = False) -> None:
    logger.debug("install_pip_with_package called with %s %s dry_run=%s", requirements_path, package, dry_run)
    req_path = Path(requirements_path)
    if not req_path.exists():
        req_path.parent.mkdir(parents=True, exist_ok=True)
        req_path.write_text("")

    append_to_file(str(req_path), package)
    logger.info("Updated %s to include %s", req_path, package)

    if dry_run:
        logger.info("dry_run: skipping pip install for %s", package)
        return

    # install using pip -r to mirror original behavior
    try:
        logger.info("Running pip install -r %s", req_path)
        run_silent(f'python -m pip install -r "{req_path}"', cwd=str(req_path.parent))
    except Exception as e:
        logger.exception("pip install failed: %s", e)


def install_npm_with_package(package_json_path: Union[str, Path], package: str, version: str = '*', dry_run: bool = False) -> None:
    logger.debug("install_npm_with_package called with %s %s@%s dry_run=%s", package_json_path, package, version, dry_run)
    pkg_path = Path(package_json_path)
    if not pkg_path.exists():
        logger.debug("package.json not found: %s", pkg_path)
        return

    add_to_package_json(str(pkg_path), package, version)
    logger.info("Updated %s to include %s@%s", pkg_path, package, version)

    if dry_run:
        logger.info("dry_run: skipping npm install for %s", package)
        return

    try:
        logger.info("Running npm install in %s", pkg_path.parent)
        run_silent('npm install', cwd=str(pkg_path.parent))
    except Exception as e:
        logger.exception("npm install failed: %s", e)
