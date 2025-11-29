#!/usr/bin/env node
import { LocalnetClient } from '../dist/client.js';
import { verifySchedulerLocation, verifyAosModule } from '../dist/index.js';

const client = new LocalnetClient();

async function main() {
  console.log('\n🧪 Testing Auto-Seed Functionality\n');
  
  console.log('📊 Initial state:');
  const hasSchedulerBefore = await verifySchedulerLocation();
  const hasModuleBefore = await verifyAosModule();
  console.log(`   Scheduler location: ${hasSchedulerBefore ? '✅' : '❌'}`);
  console.log(`   AOS module: ${hasModuleBefore ? '✅' : '❌'}`);
  
  if (!hasSchedulerBefore || !hasModuleBefore) {
    console.log('\n📦 Missing data detected - testing auto-seed on start...\n');
    
    await client.restart({
      persist: true,
      waitForHealthy: true,
      autoSeed: true,
      onProgress: (msg) => console.log(`   ${msg}`),
    });
    
    console.log('\n📊 State after restart (force reload config):');
    const hasSchedulerAfter = await verifySchedulerLocation(true);
    const hasModuleAfter = await verifyAosModule(true);
    console.log(`   Scheduler location: ${hasSchedulerAfter ? '✅' : '❌'}`);
    console.log(`   AOS module: ${hasModuleAfter ? '✅' : '❌'}`);
    
    if (hasSchedulerAfter && hasModuleAfter) {
      console.log('\n✅ Auto-seed SUCCESS!\n');
    } else {
      console.log('\n❌ Auto-seed FAILED!\n');
      process.exit(1);
    }
  } else {
    console.log('\n✅ Data already present.\n');
  }
}

main().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
