"""Command-line interface for pyjs package."""
import argparse
import logging
import sys

from .index import pre_install


def main(argv=None):
    parser = argparse.ArgumentParser(prog="pyjs-preinstall")
    parser.add_argument("--package", "-p", default=None, help="Package name to add (overrides config DEFAULT_PACKAGE)")
    parser.add_argument("--root", "-r", default=None, help="Root directory to scan (overrides config TARGET_DIR)")
    parser.add_argument("--dry-run", dest="dry_run", action="store_true", help="Don't perform installs or pushes; just simulate")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')

    try:
        pre_install(package_name=args.package, root_dir=args.root, dry_run=args.dry_run)
    except Exception as e:
        logging.exception("pre_install failed: %s", e)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
