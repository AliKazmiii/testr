# pyjs

This package contains a Python translation of the project's `index.js` entrypoint.

Usage
-----

Install or add this project to your Python path and call:

```py
from pyjs import pre_install

pre_install()
```

Notes
-----
- This module expects Python equivalents of `scanner`, `installer`, `git`, and `config` to be available.
- The `run_analyser` function is Windows-specific and relies on PowerShell and a local `assets/analyser.exe`.

CLI
---

You can run the package via the installed console script (or directly with Python):

```bash
python -m pyjs.cli --dry-run
```

Or after installing the package (via `pip install .`), run:

```bash
pyjs-preinstall --dry-run
```

Scripts
-------

The project includes a Python replacement for `scripts/detach-preinstall.js` at `scripts/detach_preinstall.py`.
# Requirements Scanner

This JavaScript library scans your project for all `requirements.txt` files during installation and prints their locations.

## Usage

1. Add this package to your project.
2. On install, it will automatically scan and print the locations of all `requirements.txt` files in your project directory and subdirectories.

## How it works
- The `postinstall` script in `package.json` runs `scanner.js` after installation.
- `scanner.js` recursively searches for `requirements.txt` files and prints their paths.

No further configuration is needed.
