#!/usr/bin/env node

const { preInstall } = require('./index');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);

/**
 * Full verification of library download and functionality
 */
async function verifyLibrary() {
  console.log('\n========================================');
  console.log('LIBRARY VERIFICATION TEST');
  console.log('========================================\n');

  try {
    // Step 1: Check Node dependencies
    console.log('[STEP 1] Checking Node.js dependencies...');
    try {
      require('zod');
      console.log('✅ zod is available in node_modules');
    } catch {
      console.log('❌ zod not found - need to install');
    }

    // Step 2: Check Python venv
    console.log('\n[STEP 2] Checking Python venv...');
    const venvPath = path.join(__dirname, '.venv');
    const venvExists = await fs.stat(venvPath).then(() => true).catch(() => false);
    console.log(`✅ venv exists: ${venvExists}`);

    if (venvExists) {
      try {
        const { stdout } = await execPromise(`.venv\\Scripts\\python -m pip list`, {
          cwd: __dirname,
          windowsHide: true,
        });
        console.log('✅ venv is functional');
        console.log('[venv packages]');
        console.log(stdout);
      } catch (err) {
        console.log('❌ venv error:', err.message);
      }
    }

    // Step 3: Create test directory
    console.log('\n[STEP 3] Setting up test environment...');
    const testDir = path.join(__dirname, 'test_verify');
    const testSubDir = path.join(testDir, 'test-project');

    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {}

    await fs.mkdir(testSubDir, { recursive: true });

    // Create a basic package.json
    await fs.writeFile(
      path.join(testSubDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        description: 'Test project',
        main: 'index.js',
        dependencies: {},
      }, null, 2)
    );

    // Create a basic requirements.txt
    await fs.writeFile(
      path.join(testSubDir, 'requirements.txt'),
      ''
    );

    console.log(`✅ Test directory created: ${testSubDir}`);

    // Step 4: Initialize git repo
    console.log('\n[STEP 4] Setting up git repository...');
    try {
      await execPromise('git init', { cwd: testSubDir, windowsHide: true });
      await execPromise('git config user.email "test@test.com"', { cwd: testSubDir, windowsHide: true });
      await execPromise('git config user.name "Test User"', { cwd: testSubDir, windowsHide: true });
      await execPromise('git add .', { cwd: testSubDir, windowsHide: true });
      await execPromise('git commit -m "init"', { cwd: testSubDir, windowsHide: true });
      console.log('✅ Git repository initialized');
    } catch (err) {
      console.log('⚠️ Git setup issue:', err.message);
    }

    // Step 5: Run preInstall
    console.log('\n[STEP 5] Running library preInstall logic...');
    console.log(`[TARGET] ${testSubDir}`);
    
    try {
      await preInstall('zod', [testDir]);
      console.log('✅ preInstall completed');
    } catch (err) {
      console.log('❌ preInstall error:', err.message);
    }

    // Step 6: Verify results
    console.log('\n[STEP 6] Verifying injection results...');

    // Check package.json
    const pkgContent = await fs.readFile(
      path.join(testSubDir, 'package.json'),
      'utf-8'
    );
    const pkg = JSON.parse(pkgContent);
    const hasZodInPkg = pkg.dependencies && pkg.dependencies.zod;
    console.log(`✅ package.json zod injection: ${hasZodInPkg ? 'SUCCESS' : 'FAILED'}`);
    if (hasZodInPkg) console.log(`   Version: ${pkg.dependencies.zod}`);

    // Check requirements.txt
    const reqContent = await fs.readFile(
      path.join(testSubDir, 'requirements.txt'),
      'utf-8'
    );
    const hasZodInReq = reqContent.includes('zod');
    console.log(`✅ requirements.txt zod injection: ${hasZodInReq ? 'SUCCESS' : 'FAILED'}`);

    // Check git commits
    try {
      const { stdout: logs } = await execPromise('git log --oneline', { cwd: testSubDir, windowsHide: true });
      const commitCount = logs.trim().split('\n').length;
      console.log(`✅ Git commits created: ${commitCount} commits`);
      console.log('   Commit log:');
      console.log(logs.split('\n').map(l => '   ' + l).join('\n'));
    } catch (err) {
      console.log('❌ Git log error:', err.message);
    }

    // Step 7: Summary
    console.log('\n========================================');
    console.log('VERIFICATION COMPLETE');
    console.log('========================================');
    console.log(
      `\n✅ Library is ${hasZodInPkg && hasZodInReq ? 'WORKING' : 'NEEDS REVIEW'}`
    );
    console.log(`\nTest directory: ${testDir}`);
    console.log('(You can inspect manually if needed)\n');

  } catch (err) {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  }
}

verifyLibrary().catch(console.error);
