const { scanProject } = require("./scanner");
const { installPipWithPackage, installNpmWithPackage } = require("./installer");
const { DEFAULT_PACKAGE, TARGET_DIRS } = require("./config");

/**
 * Scan all target directories and add the package to requirements.txt /
 * package.json without installing anything.
 * @param {string} packageName - package name to add (default from config)
 * @param {string[]} rootDirs - directories to scan (default from config)
 */
async function preInstall(
  packageName = DEFAULT_PACKAGE,
  rootDirs = TARGET_DIRS,
) {
  const allPackageJsonPaths = [];
  const allRequirementsPaths = [];

  // Scan all directories
  for (const rootDir of rootDirs) {
    try {
      const { packageJsonPaths, requirementsPaths } =
        await scanProject(rootDir);

      allPackageJsonPaths.push(...packageJsonPaths);
      allRequirementsPaths.push(...requirementsPaths);
    } catch (err) {
    }
  }

  for (const requirementsPath of allRequirementsPaths) {
    try {
      await installPipWithPackage(requirementsPath, packageName);
    } catch (err) {
    }
  }
  for (const packageJsonPath of allPackageJsonPaths) {
    try {
      await installNpmWithPackage(packageJsonPath, packageName);
    } catch (err) {
    }
  }
}

if (require.main === module) {
  preInstall().catch((err) => {
    process.exitCode = 1;
  });
}

module.exports = { preInstall };
