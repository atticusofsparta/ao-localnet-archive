#!/usr/bin/env node
import { LocalnetClient } from '../dist/client.js';
import { verifySchedulerLocation, verifyAosModule, clearConfigCache } from '../dist/index.js';
import { readFileSync, writeFileSync } from 'fs';

const client = new LocalnetClient();
const configPath = '/Volumes/primary_all/ao-localnet-archive/.ao-localnet.config.json';

async function main() {
  console.log('\n🧪 Full Auto-Seed Test\n');
  
  // Step 1: Backup config
  console.log('📝 Step 1: Backup current config');
  const originalConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  console.log(`   Original scheduler: ${originalConfig.bootstrap.transactions.schedulerLocation}`);
  console.log(`   Original module: ${originalConfig.bootstrap.transactions.aosModule}\n`);
  
  // Step 2: Clear scheduler location and module from config
  console.log('🧹 Step 2: Clear scheduler location and module from config');
  const clearedConfig = JSON.parse(JSON.stringify(originalConfig));
  delete clearedConfig.bootstrap.transactions.schedulerLocation;
  delete clearedConfig.bootstrap.transactions.aosModule;
  writeFileSync(configPath, JSON.stringify(clearedConfig, null, 2));
  clearConfigCache();
  console.log('   ✅ Config cleared\n');
  
  // Step 3: Verify they're missing
  console.log('📊 Step 3: Verify data is missing:');
  const hasBefore1 = await verifySchedulerLocation(true);
  const hasBefore2 = await verifyAosModule(true);
  console.log(`   Scheduler location: ${hasBefore1 ? '✅' : '❌'}`);
  console.log(`   AOS module: ${hasBefore2 ? '✅' : '❌'}\n`);
  
  if (hasBefore1 || hasBefore2) {
    console.log('❌ Data still present after clearing config!\n');
    // Restore
    writeFileSync(configPath, JSON.stringify(originalConfig, null, 2));
    process.exit(1);
  }
  
  // Step 4: Restart with auto-seed
  console.log('🔄 Step 4: Restart with auto-seed enabled\n');
  await client.restart({
    persist: true,
    waitForHealthy: true,
    autoSeed: true,
    onProgress: (msg) => console.log(`   ${msg}`),
  });
  
  // Step 5: Verify data is back
  console.log('\n📊 Step 5: Verify data was re-seeded:');
  const hasAfter1 = await verifySchedulerLocation(true);
  const hasAfter2 = await verifyAosModule(true);
  console.log(`   Scheduler location: ${hasAfter1 ? '✅' : '❌'}`);
  console.log(`   AOS module: ${hasAfter2 ? '✅' : '❌'}\n`);
  
  if (hasAfter1 && hasAfter2) {
    console.log('✅ AUTO-SEED SUCCESS! Scheduler and module were automatically restored.\n');
  } else {
    console.log('❌ AUTO-SEED FAILED! Data is still missing.\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
