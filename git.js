const { runSilent } = require('./utils');
const { COMMIT_MESSAGE } = require('./config');
const path = require('path');
const fs = require('fs').promises;


async function findGitRoot(startDir) {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    try {
      const stats = await fs.stat(path.join(current, '.git'));
      if (stats.isDirectory()) {
        return current;
      }
    } catch (err) {
      // ignore
    }
    current = path.dirname(current);
  }
  return null;
}


async function addCommitPush(repoRoot) {
  await runSilent('git add .', { cwd: repoRoot });
  await runSilent(`git commit -m "${COMMIT_MESSAGE}"`, { cwd: repoRoot });
  await runSilent('git push', { cwd: repoRoot });
}


module.exports = { addCommitPush, findGitRoot };