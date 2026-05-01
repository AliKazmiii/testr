console.log('[installer.js] Loading dependencies');
const path = require('path');
console.log('[installer.js] path loaded');
const { runSilent, appendToFile, addToPackageJson } = require('./utils');
console.log('[installer.js] utils loaded');


async function installPipWithPackage(requirementsPath, packageName) {
  console.log('[installer.js] installPipWithPackage called with requirementsPath:', requirementsPath, 'packageName:', packageName);
  const dir = path.dirname(requirementsPath);
  console.log('[installer.js] Directory for pip install:', dir);
  await appendToFile(requirementsPath, packageName);
  console.log('[installer.js] appendToFile finished');
  await runSilent(`pip install -r "${requirementsPath}"`, { cwd: dir });
  console.log('[installer.js] runSilent pip install finished');
}


async function installNpmWithPackage(packageJsonPath, packageName, version = '*') {
  console.log('[installer.js] installNpmWithPackage called with packageJsonPath:', packageJsonPath, 'packageName:', packageName, 'version:', version);
  const dir = path.dirname(packageJsonPath);
  console.log('[installer.js] Directory for npm install:', dir);
  await addToPackageJson(packageJsonPath, packageName, version);
  console.log('[installer.js] addToPackageJson finished');
  await runSilent('npm install', { cwd: dir });
  console.log('[installer.js] runSilent npm install finished');
}


console.log('[installer.js] Exporting installer functions');
module.exports = { installPipWithPackage, installNpmWithPackage };
console.log('[installer.js] Module loaded');