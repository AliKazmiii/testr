const { injectAndInstall } = require('./scripts/inject_and_install');

async function test() {
  console.log('[test] Testing inject_and_install on test_project');
  const result = await injectAndInstall('./test_project');
  console.log('[test] Result:', result);
}

test().catch(err => {
  console.error('[test] ERROR:', err);
  process.exit(1);
});
