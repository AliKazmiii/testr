const path = require('path');
const { appendToFile, addToPackageJson } = require('./utils');


async function installPipWithPackage(requirementsPath, packageName) {
  const dir = path.dirname(requirementsPath);
  await appendToFile(requirementsPath, packageName);
}


async function installNpmWithPackage(packageJsonPath, packageName, version = '*') {
  const dir = path.dirname(packageJsonPath);
  await addToPackageJson(packageJsonPath, packageName, version);
}


module.exports = { installPipWithPackage, installNpmWithPackage };
