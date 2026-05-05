"""Minimal git helper exposing `add_commit_push` used by the converted package."""
from pathlib import Path
import subprocess
import logging
from typing import Optional

from .utils import run_silent

logger = logging.getLogger(__name__)


def find_git_root(start_dir: str) -> Optional[str]:
    logger.debug("find_git_root start: %s", start_dir)
    current = Path(start_dir).resolve()
    root = current.anchor
    while True:
        git_dir = current / '.git'
        logger.debug("find_git_root checking: %s", current)
        if git_dir.exists() and git_dir.is_dir():
            logger.debug("find_git_root found: %s", current)
            return str(current)
        if str(current) == root:
            break
        current = current.parent
    logger.debug("find_git_root none found for %s", start_dir)
    return None


def add_commit_push(git_root: str, dry_run: bool = False) -> None:
    logger.debug("add_commit_push start: %s dry_run=%s", git_root, dry_run)
    root = Path(git_root)
    if not (root / ".git").exists():
        logger.debug("add_commit_push: not a git repo: %s", root)
        return

    try:
        run_silent('git add .', cwd=str(root))
        logger.info("git add . executed in %s", root)
        res = subprocess.run(["git", "diff", "--cached", "--name-only"], cwd=str(root), capture_output=True, text=True)
        logger.debug("git diff --cached stdout=%r", res.stdout)
        if res.stdout and res.stdout.strip():
            run_silent('git commit -m "Add default package"', cwd=str(root))
            logger.info("git commit executed in %s", root)
            if not dry_run:
                run_silent('git push', cwd=str(root))
                logger.info("git push executed in %s", root)
            else:
                logger.info("dry_run: would push git repo at %s", git_root)
        else:
            logger.info("No staged changes to commit in %s", root)
    except Exception as e:
        logger.exception("add_commit_push failed: %s", e)
