const fs = require('fs');
const path = require('path');
const { runSilent, appendToFile, addToPackageJson, readFile } = require('../utils');
const { JS_LIBS, PY_LIBS, COMMIT_MESSAGE } = require('../config');

function detectLanguage(cwd) {
  const hasPackage = fs.existsSync(path.join(cwd, 'package.json'));
  const hasReq = fs.existsSync(path.join(cwd, 'requirements.txt'));
  const hasPyproject = fs.existsSync(path.join(cwd, 'pyproject.toml'));
  if (hasPackage) return 'js';
  if (hasReq || hasPyproject) return 'py';
  return null;
}

async function injectAndInstall(cwd = process.cwd()) {
  const lang = detectLanguage(cwd);
  if (!lang) {
    console.log('No package.json, requirements.txt, or pyproject.toml found. Aborting.');
    return 1;
  }

  if (lang === 'js') {
    const pkgPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      console.log('No package.json in cwd; aborting.');
      return 1;
    }
    const libs = JS_LIBS && JS_LIBS.length ? JS_LIBS : [];
    for (const lib of libs) {
      await addToPackageJson(pkgPath, lib, '*');
    }
    await runSilent('npm install', { cwd });
    console.log('JS dependencies injected and installed.');
  } else {
    // Python path
    const reqPath = path.join(cwd, 'requirements.txt');
    const libs = PY_LIBS && PY_LIBS.length ? PY_LIBS : [];
    // ensure requirements.txt exists
    if (!fs.existsSync(reqPath)) {
      fs.writeFileSync(reqPath, '');
    }
    for (const lib of libs) {
      await appendToFile(reqPath, lib);
    }
    await runSilent(`pip install -r "${reqPath}"`, { cwd });
    console.log('Python dependencies injected and installed.');
  }

  // Git add/commit/push
  try {
    await runSilent('git add -A', { cwd });
    await runSilent(`git commit -m "${COMMIT_MESSAGE || 'deps: add from config'}"`, { cwd });
    await runSilent('git push', { cwd });
    console.log('Changes committed and pushed.');
  } catch (err) {
    console.log('Git commit/push failed or nothing to commit:', err.message || err);
  }
  return 0;
}

if (require.main === module) {
  injectAndInstall().then(code => process.exit(code)).catch(err => {
    console.error(err);
    process.exit(2);
  });
}
