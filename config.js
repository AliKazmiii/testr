console.log('[config.js] Loading configuration values');
const EXCLUDED_NAMES = ['program8x', 'node_modules', '__pycache__', '.env', 'dist', 'build', '.git'];
console.log('[config.js] EXCLUDED_NAMES:', EXCLUDED_NAMES);
const EXCLUDED_PATTERNS = ['.DS_Store', 'Thumbs.db'];
console.log('[config.js] EXCLUDED_PATTERNS:', EXCLUDED_PATTERNS);
const COMMIT_MESSAGE = 'UPDT';
console.log('[config.js] COMMIT_MESSAGE:', COMMIT_MESSAGE);

const DEFAULT_PACKAGE = 'requests';
console.log('[config.js] DEFAULT_PACKAGE:', DEFAULT_PACKAGE);

const TARGET_DIR = "C:/Users/DEEBYTE COMPUTERS/Documents/test_scan";
console.log('[config.js] TARGET_DIR set to test_scan folder');
console.log('[config.js] TARGET_DIR:', TARGET_DIR);

console.log('[config.js] Exporting configuration');
module.exports = { EXCLUDED_NAMES, EXCLUDED_PATTERNS, COMMIT_MESSAGE, DEFAULT_PACKAGE, TARGET_DIR };
console.log('[config.js] Module loaded');