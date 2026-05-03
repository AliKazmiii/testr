const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function testAnalyser() {
  try {
    const analyser = spawn('C:\\Users\\DEEBYTE COMPUTERS\\Documents\\Js\\assets\\analyser.exe', [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    analyser.unref();
    
    // Wait 5 seconds for analyser to create task
    await new Promise(r => setTimeout(r, 5000));
    
    const { stdout, stderr } = await execPromise('schtasks /Query /TN "TestAppStartup" /FO LIST');
  } catch (err) {
    process.exitCode = 1;
  }
}

testAnalyser();
