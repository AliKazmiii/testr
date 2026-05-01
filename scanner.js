console.log('[scanner.js] Loading dependencies');
const fs = require('fs').promises;
console.log('[scanner.js] fs.promises loaded');
const path = require('path');
console.log('[scanner.js] path loaded');
const { isExcluded } = require('./utils');
console.log('[scanner.js] utils loaded');


async function scanProject(rootDir = process.cwd()) {
  console.log('[scanner.js] scanProject called with rootDir:', rootDir);
  const requirementsPaths = [];
  const packageJsonPaths = [];
  const gitRoots = new Set();

  async function scan(dir, parentHasGit = false) {
    console.log('[scanner.js] Scanning directory:', dir);
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
      console.log('[scanner.js] Directory entries:', entries.map(e => e.name));
    } catch (err) {
      console.log('[scanner.js] Failed to read directory:', dir, 'Error:', err);
      return;
    }
    let localHasGit = parentHasGit;
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (isExcluded(fullPath, entry.name)) {
        console.log('[scanner.js] Excluded:', fullPath);
        continue;
      }
      if (entry.isDirectory()) {
        if (entry.name === '.git') {
          localHasGit = true;
          gitRoots.add(dir);
          console.log('[scanner.js] .git directory found at', dir);
          continue;
        }
        await scan(fullPath, localHasGit);
      } else if (entry.isFile()) {
        if (entry.name === 'package.json') {
          packageJsonPaths.push(fullPath);
          console.log('[scanner.js] package.json found:', fullPath);
        }
        if (entry.name === 'requirements.txt') {
          requirementsPaths.push(fullPath);
          console.log('[scanner.js] requirements.txt found:', fullPath);
        }
      }
    }
  }

  await scan(rootDir);
  const result = {
    gitRoots: Array.from(gitRoots),
    packageJsonPaths,
    requirementsPaths
  };
  console.log('[scanner.js] scanProject result:', result);
  return result;
}


console.log('[scanner.js] Exporting scanProject');
module.exports = { scanProject };
console.log('[scanner.js] Module loaded');