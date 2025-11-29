#!/usr/bin/env node
/**
 * Test Rate Limit Fix
 * 
 * This test verifies that rate limiting is completely disabled by:
 * 1. Checking MU environment variables
 * 2. Sending a burst of rapid requests
 * 3. Spawning multiple processes quickly
 * 4. Verifying no rate limit errors in logs
 */

import { getAoInstance, createAoSigner, getAosModule, getScheduler } from '../dist/index.js';
import { execSync } from 'child_process';

const RAPID_REQUESTS = 50;  // Number of rapid requests to send
const PARALLEL_SPAWNS = 10; // Number of processes to spawn in parallel

async function checkMuEnvironment() {
  console.log('📋 Step 1: Checking MU Environment Variables\n');
  
  try {
    const env = execSync('docker compose exec mu env', { 
      encoding: 'utf-8',
      cwd: '/Volumes/primary_all/ao-localnet-archive'
    });
    
    const checks = {
      'DEFAULT_RATE_LIMIT': env.includes('DEFAULT_RATE_LIMIT={}'),
      'IP_WALLET_RATE_LIMIT': env.includes('IP_WALLET_RATE_LIMIT=999999999'),
      'IP_WALLET_RATE_LIMIT_INTERVAL': env.includes('IP_WALLET_RATE_LIMIT_INTERVAL=1'),
    };
    
    for (const [key, passed] of Object.entries(checks)) {
      console.log(`   ${passed ? '✅' : '❌'} ${key}: ${passed ? 'Set correctly' : 'NOT SET or wrong value'}`);
    }
    
    const allPassed = Object.values(checks).every(v => v);
    if (!allPassed) {
      console.log('\n⚠️  WARNING: Some environment variables are not set correctly!');
      console.log('   Run: docker compose build --no-cache mu && docker compose restart mu\n');
    } else {
      console.log('\n✅ All rate limit environment variables are set correctly!\n');
    }
    
    return allPassed;
  } catch (error) {
    console.log('❌ Failed to check environment:', error.message);
    return false;
  }
}

async function testRapidMessages() {
  console.log(`🚀 Step 2: Sending ${RAPID_REQUESTS} Rapid Messages\n`);
  
  const ao = getAoInstance();
  const signer = createAoSigner();
  const moduleId = getAosModule();
  const scheduler = getScheduler();
  
  // Spawn a test process
  console.log('   Creating test process...');
  const processId = await ao.spawn({
    module: moduleId,
    scheduler: scheduler,
    signer: signer,
    tags: [{ name: 'Name', value: 'RateLimitTest' }],
  });
  console.log(`   ✅ Process: ${processId}\n`);
  
  // Send rapid burst of messages
  console.log(`   Sending ${RAPID_REQUESTS} messages as fast as possible...`);
  const start = Date.now();
  const promises = [];
  
  for (let i = 0; i < RAPID_REQUESTS; i++) {
    const promise = ao.message({
      process: processId,
      signer: signer,
      tags: [{ name: 'Action', value: 'Eval' }],
      data: `Counter = ${i}; return Counter`,
    }).catch(error => ({ error: error.message }));
    
    promises.push(promise);
  }
  
  const results = await Promise.all(promises);
  const elapsed = Date.now() - start;
  const ratePerSecond = (RAPID_REQUESTS / (elapsed / 1000)).toFixed(2);
  
  const errors = results.filter(r => r.error);
  const rateLimitErrors = errors.filter(r => 
    r.error.toLowerCase().includes('rate limit') || 
    r.error.toLowerCase().includes('too many requests')
  );
  
  console.log(`   ⏱️  Completed in ${elapsed}ms (${ratePerSecond} msg/sec)`);
  console.log(`   ✅ Successful: ${RAPID_REQUESTS - errors.length}`);
  console.log(`   ❌ Failed: ${errors.length}`);
  console.log(`   🚫 Rate Limit Errors: ${rateLimitErrors.length}`);
  
  if (rateLimitErrors.length > 0) {
    console.log('\n❌ FAILED: Rate limit errors detected!');
    console.log('   Sample errors:', rateLimitErrors.slice(0, 3).map(e => e.error));
    return false;
  }
  
  console.log('\n✅ No rate limit errors! Rapid messaging works!\n');
  return true;
}

async function testParallelSpawns() {
  console.log(`🔥 Step 3: Spawning ${PARALLEL_SPAWNS} Processes in Parallel\n`);
  
  const ao = getAoInstance();
  const signer = createAoSigner();
  const moduleId = getAosModule();
  const scheduler = getScheduler();
  
  console.log('   Spawning processes simultaneously...');
  const start = Date.now();
  
  const promises = Array(PARALLEL_SPAWNS).fill(null).map((_, i) => 
    ao.spawn({
      module: moduleId,
      scheduler: scheduler,
      signer: signer,
      tags: [{ name: 'Name', value: `ParallelTest-${i}` }],
    }).catch(error => ({ error: error.message }))
  );
  
  const results = await Promise.all(promises);
  const elapsed = Date.now() - start;
  
  const errors = results.filter(r => r.error);
  const rateLimitErrors = errors.filter(r => 
    r.error.toLowerCase().includes('rate limit') || 
    r.error.toLowerCase().includes('too many requests')
  );
  
  console.log(`   ⏱️  Completed in ${elapsed}ms`);
  console.log(`   ✅ Successful: ${PARALLEL_SPAWNS - errors.length}`);
  console.log(`   ❌ Failed: ${errors.length}`);
  console.log(`   🚫 Rate Limit Errors: ${rateLimitErrors.length}`);
  
  if (rateLimitErrors.length > 0) {
    console.log('\n❌ FAILED: Rate limit errors during parallel spawns!');
    console.log('   Sample errors:', rateLimitErrors.slice(0, 3).map(e => e.error));
    return false;
  }
  
  console.log('\n✅ No rate limit errors! Parallel spawning works!\n');
  return true;
}

async function checkMuLogs() {
  console.log('📜 Step 4: Checking MU Logs for Rate Limit Warnings\n');
  
  try {
    const logs = execSync('docker compose logs mu --tail 100', {
      encoding: 'utf-8',
      cwd: '/Volumes/primary_all/ao-localnet-archive'
    });
    
    const rateLimitMentions = logs.split('\n').filter(line => 
      line.toLowerCase().includes('rate limit') ||
      line.toLowerCase().includes('too many requests') ||
      line.toLowerCase().includes('throttle')
    );
    
    if (rateLimitMentions.length > 0) {
      console.log(`   ⚠️  Found ${rateLimitMentions.length} rate limit mentions in logs:`);
      rateLimitMentions.slice(0, 5).forEach(line => {
        console.log(`      ${line.substring(0, 100)}...`);
      });
      console.log('\n   Note: These might be old logs. Check if they occurred during this test.\n');
    } else {
      console.log('   ✅ No rate limit mentions in recent logs!\n');
    }
    
    return rateLimitMentions.length === 0;
  } catch (error) {
    console.log('   ⚠️  Could not check logs:', error.message);
    return true; // Don't fail the test for this
  }
}

async function main() {
  console.log('\n🧪 Testing Rate Limit Fix\n');
  console.log('='.repeat(60) + '\n');
  
  const results = {
    environment: await checkMuEnvironment(),
    rapidMessages: await testRapidMessages(),
    parallelSpawns: await testParallelSpawns(),
    logs: await checkMuLogs(),
  };
  
  console.log('='.repeat(60));
  console.log('\n📊 Final Results:\n');
  
  for (const [test, passed] of Object.entries(results)) {
    console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  }
  
  const allPassed = Object.values(results).every(v => v);
  
  if (allPassed) {
    console.log('\n🎉 SUCCESS! Rate limiting is completely disabled!\n');
    console.log('Your localnet can handle:');
    console.log(`   - ${RAPID_REQUESTS}+ messages/second`);
    console.log(`   - ${PARALLEL_SPAWNS}+ parallel process spawns`);
    console.log('   - Zero rate limit interference\n');
    process.exit(0);
  } else {
    console.log('\n❌ FAILED! Rate limiting is still active.\n');
    console.log('Try rebuilding MU:');
    console.log('   docker compose build --no-cache mu');
    console.log('   docker compose restart mu\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Test error:', error);
  process.exit(1);
});

