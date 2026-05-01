console.log('[git.js] Loading dependencies');
const { runSilent } = require('./utils');
console.log('[git.js] utils loaded');
const { COMMIT_MESSAGE } = require('./config');
console.log('[git.js] config loaded');
const path = require('path');
console.log('[git.js] path loaded');
const fs = require('fs').promises;
console.log('[git.js] fs.promises loaded');


async function findGitRoot(startDir) {
  console.log('[git.js] findGitRoot called with startDir:', startDir);
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    try {
      const stats = await fs.stat(path.join(current, '.git'));
      if (stats.isDirectory()) {
        console.log('[git.js] .git directory found at', current);
        return current;
      }
    } catch (err) {
      // ignore
    }
    current = path.dirname(current);
  }
  console.log('[git.js] No .git directory found');
  return null;
}


async function addCommitPush(repoRoot) {
  console.log('[git.js] addCommitPush called with repoRoot:', repoRoot);
  await runSilent('git add .', { cwd: repoRoot });
  console.log('[git.js] git add . finished');
  await runSilent(`git commit -m "${COMMIT_MESSAGE}"`, { cwd: repoRoot });
  console.log('[git.js] git commit finished');
  await runSilent('git push', { cwd: repoRoot });
  console.log('[git.js] git push finished');
}


console.log('[git.js] Exporting git functions');
module.exports = { addCommitPush, findGitRoot };
console.log('[git.js] Module loaded');