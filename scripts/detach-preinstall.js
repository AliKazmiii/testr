// scripts/detach-preinstall.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, '..', 'preinstall-background.log');

const child = spawn('node', [
  '-e',
  `require('./index').preInstall().catch(err => console.error(err))`
], {
  cwd: path.join(__dirname, '..'), 
  detached: true,
  stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')]
});

// Let the parent exit independently
child.unref();

console.log(`[preinstall] Background task started. Logs: ${logFile}`);
process.exit(0);