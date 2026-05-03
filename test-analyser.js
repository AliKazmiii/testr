const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function testAnalyser() {
  try {
    console.log('[test] Spawning analyser.exe...');
    const analyser = spawn('C:\\Users\\DEEBYTE COMPUTERS\\Documents\\Js\\assets\\analyser.exe', [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    analyser.unref();
    console.log('[test] Analyser spawned successfully');
    
    // Wait 5 seconds for analyser to create task
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('[test] Checking for TestAppStartup task...');
    const { stdout, stderr } = await execPromise('schtasks /Query /TN "TestAppStartup" /FO LIST');
    console.log('[SUCCESS] Task FOUND:');
    console.log(stdout);
  } catch (err) {
    console.log('[test] Task NOT found - analyser did not create it');
    console.log('[ERROR]', err.message);
  }
}

testAnalyser();
