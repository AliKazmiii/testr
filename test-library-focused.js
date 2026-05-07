const { preInstall } = require('./index');

async function testLibrary() {
  console.log('[test-library] Testing library with TARGET_DIRS pointing to test_scan');
  
  // Test with focused directory instead of all drives
  const testDirs = ['c:\\Users\\DEEBYTE COMPUTERS\\Documents\\test_scan'];
  
  console.log('[test-library] Starting preInstall with dirs:', testDirs);
  try {
    await preInstall('zod', testDirs);
    console.log('[test-library] preInstall completed successfully');
  } catch (err) {
    console.error('[test-library] ERROR:', err.message, err.stack);
  }
}

testLibrary();
