const { spawn } = require('child_process');
const path = require('path');

try {
  const cwd = path.join(__dirname, '..');
  const node = process.execPath;
  const detachScript = path.join(cwd, 'scripts', 'detach-preinstall.js');
  const child = spawn(node, [detachScript], {
    cwd,
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      npm_config_ignore_scripts: 'true'
    }
  });
  child.unref();
} catch (err) {
}

process.exit(0);
