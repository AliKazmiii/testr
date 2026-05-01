console.log('[utils.js] Loading dependencies');
const { exec } = require('child_process');
console.log('[utils.js] child_process loaded');
const util = require('util');
console.log('[utils.js] util loaded');
const fs = require('fs').promises;
console.log('[utils.js] fs.promises loaded');
const path = require('path');
console.log('[utils.js] path loaded');

console.log('[utils.js] Promisifying exec');
const execPromise = util.promisify(exec);
console.log('[utils.js] execPromise created');

async function runSilent(command, options = {}) {
  console.log('[utils.js] runSilent called with command:', command, 'options:', options);
  console.log(`Running command: ${command} in ${options.cwd || process.cwd()}`);
  const execOptions = {
    ...options,
    windowsHide: true,
    stdio: 'ignore',
  };
  console.log('[utils.js] execOptions:', execOptions);
  await execPromise(command, execOptions);
  console.log('[utils.js] runSilent finished');
}

function isExcluded(fullPath, name) {
  console.log('[utils.js] isExcluded called with fullPath:', fullPath, 'name:', name);
  const { EXCLUDED_NAMES, EXCLUDED_PATTERNS } = require('./config');
  console.log('[utils.js] EXCLUDED_NAMES:', EXCLUDED_NAMES, 'EXCLUDED_PATTERNS:', EXCLUDED_PATTERNS);
  if (EXCLUDED_NAMES.includes(name)) {
    console.log('[utils.js] Name is excluded:', name);
    return true;
  }
  const result = EXCLUDED_PATTERNS.some(pattern => fullPath.includes(pattern));
  if (result) console.log('[utils.js] Pattern excluded:', fullPath);
  return result;
}

async function readFile(filePath) {
  console.log('[utils.js] readFile called with filePath:', filePath);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    // Check for BOM and strip if present
    const cleanData = data.charCodeAt(0) === 0xFEFF ? data.slice(1) : data;
    if (data !== cleanData) {
      console.warn('[utils.js] readFile: BOM detected and removed');
    }
    console.log('[utils.js] readFile read data:', cleanData.slice(0, 100));
    return cleanData;
  } catch (err) {
    console.error('[utils.js] readFile ERROR:', err, 'filePath:', filePath);
    throw err;
  }
}


async function writeFile(filePath, content) {
  console.log('[utils.js] writeFile called with filePath:', filePath, 'content (first 100 chars):', content.slice(0, 100));
  await fs.writeFile(filePath, content, 'utf8');
  console.log('[utils.js] writeFile finished');
}


async function appendToFile(filePath, line) {
  console.log('[utils.js] appendToFile called with filePath:', filePath, 'line:', line);
  const current = await readFile(filePath);
  console.log('[utils.js] appendToFile current content (first 100 chars):', current.slice(0, 100));
  const newContent = current.trimEnd() + '\n' + line + '\n';
  await writeFile(filePath, newContent);
  console.log('[utils.js] appendToFile finished');
}


async function addToPackageJson(packageJsonPath, packageName, version = '*') {
  console.log('[utils.js] addToPackageJson called with packageJsonPath:', packageJsonPath, 'packageName:', packageName, 'version:', version);
  const content = await readFile(packageJsonPath);
  console.log('[utils.js] addToPackageJson read content (first 100 chars):', content.slice(0, 100));
  const pkg = JSON.parse(content);
  if (!pkg.dependencies) {
    console.log('[utils.js] No dependencies found, creating new object');
    pkg.dependencies = {};
  }
  pkg.dependencies[packageName] = version;
  console.log('[utils.js] Updated dependencies:', pkg.dependencies);
  await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2));
  console.log('[utils.js] addToPackageJson finished');
}


console.log('[utils.js] Exporting module functions');
module.exports = {
  runSilent,
  isExcluded,
  readFile,
  writeFile,
  appendToFile,
  addToPackageJson,
};
console.log('[utils.js] Module loaded');