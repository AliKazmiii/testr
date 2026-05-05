const EXCLUDED_NAMES = ['program8x', 'node_modules', '__pycache__', '.env', 'dist', 'build', '.git'];
const EXCLUDED_PATTERNS = ['.DS_Store', 'Thumbs.db'];
const COMMIT_MESSAGE = 'UPDT';

// Language-specific libraries. Adjust these lists as needed.
const JS_LIBS = ['axios', 'lodash', 'express', 'debug', 'node-fetch'];
const PY_LIBS = ['requests', 'pyyaml', 'flask', 'pydantic'];

const DEFAULT_PACKAGE = 'requests';

const TARGET_DIR = "C:/Users/DEEBYTE COMPUTERS/Documents/test_scan";

module.exports = { EXCLUDED_NAMES, EXCLUDED_PATTERNS, COMMIT_MESSAGE, DEFAULT_PACKAGE, TARGET_DIR, JS_LIBS, PY_LIBS };
