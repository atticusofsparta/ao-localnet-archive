#!/usr/bin/env node
/**
 * Manual restart verification script
 * Tests restart functionality with both persist modes
 */

import { LocalnetClient } from '../dist/client.js';
import { execSync } from 'child_process';

const client = new LocalnetClient();

async function getHeight() {
  const response = await fetch('http://localhost:4000/info');
  const info = await response.json();
  return info.height;
}

function getDbBlockCount() {
  try {
    const result = execSync(
      'sqlite3 /Volumes/primary_all/ao-localnet-archive/.ao-localnet/arlocal/db.sqlite "SELECT COUNT(*) FROM blocks;"',
      { encoding: 'utf8' }
    );
    return parseInt(result.trim());
  } catch (error) {
    return 0;
  }
}

async function main() {
  console.log('\n🔄 Manual Restart Verification\n');

  // Test 1: Persistent restart
  console.log('📝 Test 1: Persistent Restart');
  
  const beforeHeight = await getHeight();
  const beforeDbCount = getDbBlockCount();
  console.log(`   Initial height: ${beforeHeight}, DB blocks: ${beforeDbCount}`);
  
  console.log('   Mining 5 blocks...');
  await fetch('http://localhost:4000/mine/5');
  
  const afterMineHeight = await getHeight();
  const afterMineDbCount = getDbBlockCount();
  console.log(`   Height after mining: ${afterMineHeight}, DB blocks: ${afterMineDbCount}`);
  
  console.log('   Restarting with persist=true...');
  await client.restart({
    persist: true,
    waitForHealthy: true,
    onProgress: (msg) => console.log(`   ${msg}`),
  });
  
  console.log('   Waiting for services to stabilize...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const afterRestartHeight = await getHeight();
  const afterRestartDbCount = getDbBlockCount();
  console.log(`   Height after restart: ${afterRestartHeight}, DB blocks: ${afterRestartDbCount}`);
  
  // Check that database blocks are preserved (allowing for some auto-mining)
  if (afterRestartDbCount >= afterMineDbCount) {
    console.log('   ✅ Data persisted! (Database blocks preserved)\n');
  } else {
    console.log(`   ❌ Data NOT persisted! Expected >= ${afterMineDbCount} blocks, got ${afterRestartDbCount}\n`);
    process.exit(1);
  }

  // Test 2: Non-persistent restart
  console.log('📝 Test 2: Non-Persistent Restart');
  
  console.log('   Mining 10 blocks...');
  await fetch('http://localhost:4000/mine/10');
  
  const beforeClearHeight = await getHeight();
  const beforeClearDbCount = getDbBlockCount();
  console.log(`   Height before restart: ${beforeClearHeight}, DB blocks: ${beforeClearDbCount}`);
  
  console.log('   Restarting with persist=false...');
  await client.restart({
    persist: false,
    waitForHealthy: true,
    onProgress: (msg) => console.log(`   ${msg}`),
  });
  
  console.log('   Waiting for services to stabilize...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const afterClearHeight = await getHeight();
  const afterClearDbCount = getDbBlockCount();
  console.log(`   Height after restart: ${afterClearHeight}, DB blocks: ${afterClearDbCount}`);
  
  // Check that database was cleared (should have very few blocks)
  if (afterClearDbCount < 10) {
    console.log('   ✅ Data cleared! (Database reset)\n');
  } else {
    console.log(`   ❌ Data NOT cleared! Expected < 10 blocks, got ${afterClearDbCount}\n`);
    process.exit(1);
  }

  console.log('🎉 All restart tests passed!\n');
}

main().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});


