#!/usr/bin/env node

/**
 * Basic usage example of the AO Localnet SDK
 * 
 * Run this after starting and seeding the localnet:
 * npm start && npm run seed
 * node examples/basic-usage.mjs
 */

import {
  getAoInstance,
  getScheduler,
  getAosModule,
  getAuthority,
  createAoSigner,
  getUrls,
  getBootstrapInfo
} from '../dist/index.js';

console.log('🚀 AO Localnet SDK Example\n');

// Get all bootstrap info
console.log('📋 Bootstrap Information:');
const info = await getBootstrapInfo();
console.log('  Scheduler:', info.scheduler);
console.log('  Scheduler Location TX:', info.schedulerLocation);
console.log('  AOS Module:', info.aosModule);
console.log('  Authority:', info.authority);
console.log('  Gateway:', info.urls.gateway);
console.log('  MU:', info.urls.mu);
console.log('  CU:', info.urls.cu);
console.log('');

// Create AO instance and signer
console.log('🔧 Creating AO instance and signer...');
const ao = getAoInstance();
const signer = createAoSigner();
const moduleId = getAosModule();
const scheduler = getScheduler();
console.log('✅ Ready\n');

// Spawn a process
console.log('📝 Spawning a new process...');
try {
  const processId = await ao.spawn({
    module: moduleId,
    scheduler: scheduler,
    signer: signer,
    tags: [
      { name: 'Name', value: 'SDK-Example-Process' },
      { name: 'Description', value: 'Example process created by the SDK' },
    ],
  });
  console.log('✅ Process spawned:', processId);
  console.log('');

  // Send a message
  console.log('📨 Sending a message to the process...');
  const messageId = await ao.message({
    process: processId,
    signer: signer,
    tags: [
      { name: 'Action', value: 'Eval' },
    ],
    data: 'return "Hello from AO Localnet SDK!"',
  });
  console.log('✅ Message sent:', messageId);
  console.log('');

  console.log('🎉 Example completed successfully!');
  console.log('');
  console.log('Try reading the result with:');
  console.log(`  const result = await ao.result({ message: "${messageId}", process: "${processId}" });`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

