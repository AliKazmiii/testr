"""Project scanner: locate git roots, package.json and requirements.txt files.

This mirrors the behavior of the original JS `scanner.js` by recursively
walking directories, applying `is_excluded` checks, and tracking whether a
parent directory already contains a `.git` folder.
"""
from pathlib import Path
import os
import logging
from typing import Dict, List

from .utils import is_excluded

logger = logging.getLogger(__name__)


def scan_project(root_dir: str = None) -> Dict[str, List[str]]:
    root_dir = root_dir or "."
    root = Path(root_dir).resolve()
    requirements_paths = []
    package_json_paths = []
    git_roots = set()

    logger.debug("scan_project: root=%s", root)

    def _scan(dir_path: Path, parent_has_git: bool = False):
        try:
            entries = list(dir_path.iterdir())
        except Exception as e:
            logger.debug("scan_project: cannot list %s: %s", dir_path, e)
            return

        local_has_git = parent_has_git
        for entry in entries:
            name = entry.name
            full_path = str(entry)

            # Always detect .git directories before applying exclusion rules
            if entry.is_dir() and name == '.git':
                local_has_git = True
                git_roots.add(str(dir_path))
                logger.debug("scan_project: found .git in %s", dir_path)
                continue

            if is_excluded(full_path, name):
                logger.debug("scan_project: excluded %s", full_path)
                continue

            if entry.is_dir():
                _scan(entry, local_has_git)
            elif entry.is_file():
                if name == 'package.json':
                    package_json_paths.append(full_path)
                    logger.debug("scan_project: found package.json: %s", full_path)
                if name == 'requirements.txt':
                    requirements_paths.append(full_path)
                    logger.debug("scan_project: found requirements.txt: %s", full_path)

    _scan(root, False)

    result = {
        'git_roots': list(git_roots),
        'package_json_paths': package_json_paths,
        'requirements_paths': requirements_paths,
    }
    logger.debug("scan_project result: %s", result)
    return result
