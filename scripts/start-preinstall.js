const { spawn } = require('child_process');
const path = require('path');

// Launch a detached Node process that runs the package's preInstall routine
// without blocking the current npm install. This script should be fast and
// always exit 0 so it doesn't interfere with the install lifecycle.

try {
  const node = process.execPath;
  const cwd = path.join(__dirname, '..');
  const child = spawn(node, [
    '-e',
    `require('./index').preInstall().catch(()=>process.exitCode=1)`
  ], {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
    env: { ...process.env, PREINSTALL_RUNNING: 'true', npm_config_ignore_scripts: 'true' }
  });

  child.unref();
  console.log('[start-preinstall] Detached preinstall process spawned. PID:', child.pid);
} catch (err) {
  console.error('[start-preinstall] Failed to spawn detached preinstall:', err && err.message ? err.message : err);
}

// Exit immediately so npm proceeds with install
process.exit(0);
