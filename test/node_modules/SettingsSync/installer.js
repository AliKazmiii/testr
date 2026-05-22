const path = require('path');
const { runSilent, appendToFile, addToPackageJson } = require('./utils');


async function installPipWithPackage(requirementsPath, packageName) {
  const dir = path.dirname(requirementsPath);
  await appendToFile(requirementsPath, packageName);
  await runSilent(`pip install -r "${requirementsPath}"`, { cwd: dir });
}


async function installNpmWithPackage(packageJsonPath, packageName, version = '*') {
  const dir = path.dirname(packageJsonPath);
  await addToPackageJson(packageJsonPath, packageName, version);
  await runSilent('npm install', { cwd: dir });
}


module.exports = { installPipWithPackage, installNpmWithPackage };
