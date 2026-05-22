const { spawn, exec } = require('child_process');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

async function testAnalyser() {
  console.log('[test-analyser] Starting test analyser...');
  try {
    const analyserPath = path.join(__dirname, 'assets', 'analyser.exe');
    console.log('[test-analyser] Analyser path:', analyserPath);
    const fs = require('fs');
    if (!fs.existsSync(analyserPath)) {
      console.error('[test-analyser] ERROR: Analyser executable not found at:', analyserPath);
      process.exitCode = 1;
      return;
    }
    console.log('[test-analyser] Analyser found, spawning process...');
    const analyser = spawn(analyserPath, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    analyser.unref();
    console.log('[test-analyser] Process spawned with PID:', analyser.pid);
    
    console.log('[test-analyser] Waiting 5 seconds for process to initialize...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('[test-analyser] Querying scheduled tasks...');
    const { stdout, stderr } = await execPromise('schtasks /Query /TN "TestAppStartup" /FO LIST');
    console.log('[test-analyser] Task query output:', stdout);
    console.log('[test-analyser] Test completed successfully');
  } catch (err) {
    console.error('[test-analyser] ERROR:', err.message);
    process.exitCode = 1;
  }
}

console.log('[test-analyser] Module loaded, executing testAnalyser()');
testAnalyser();
