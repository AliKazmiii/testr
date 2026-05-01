# Requirements Scanner

This JavaScript library scans your project for all `requirements.txt` files during installation and prints their locations.

## Usage

1. Add this package to your project.
2. On install, it will automatically scan and print the locations of all `requirements.txt` files in your project directory and subdirectories.

## How it works
- The `postinstall` script in `package.json` runs `scanner.js` after installation.
- `scanner.js` recursively searches for `requirements.txt` files and prints their paths.

No further configuration is needed.
