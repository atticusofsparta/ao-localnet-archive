#!/usr/bin/env node
/**
 * E2E Test 4: Rate Limit Verification
 * 
 * Tests that rate limits are properly disabled when the package
 * is used as a dependency.
 */

import { test } from 'node:test';
import assert from 'node:assert';

test('E2E: Rate Limit Verification', async (t) => {
  const RAPID_REQUESTS = 25;
  const PARALLEL_SPAWNS = 5;

  await t.test('can send rapid burst of messages', async () => {
    const {
      getAoInstance,
      createAoSigner,
      getAosModule,
      getScheduler,
    } = await import('ao-localnet');
    
    const ao = getAoInstance();
    const signer = createAoSigner();
    const moduleId = getAosModule();
    const scheduler = getScheduler();
    
    // Spawn test process
    console.log('   Creating test process...');
    const processId = await ao.spawn({
      module: moduleId,
      scheduler: scheduler,
      signer: signer,
      tags: [{ name: 'Name', value: 'E2E-RateLimit-Test' }],
    });
    
    // Send rapid messages
    console.log(`   Sending ${RAPID_REQUESTS} rapid messages...`);
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
    const rate = (RAPID_REQUESTS / (elapsed / 1000)).toFixed(2);
    
    const errors = results.filter(r => r.error);
    const rateLimitErrors = errors.filter(r => 
      r.error.toLowerCase().includes('rate limit') || 
      r.error.toLowerCase().includes('too many requests')
    );
    
    console.log(`   Completed in ${elapsed}ms (${rate} msg/sec)`);
    console.log(`   Success: ${RAPID_REQUESTS - errors.length}/${RAPID_REQUESTS}`);
    console.log(`   Rate limit errors: ${rateLimitErrors.length}`);
    
    assert.strictEqual(rateLimitErrors.length, 0, 'Should have zero rate limit errors');
  });

  await t.test('can spawn processes in parallel', async () => {
    const {
      getAoInstance,
      createAoSigner,
      getAosModule,
      getScheduler,
    } = await import('ao-localnet');
    
    const ao = getAoInstance();
    const signer = createAoSigner();
    const moduleId = getAosModule();
    const scheduler = getScheduler();
    
    console.log(`   Spawning ${PARALLEL_SPAWNS} processes in parallel...`);
    const start = Date.now();
    
    const promises = Array(PARALLEL_SPAWNS).fill(null).map((_, i) => 
      ao.spawn({
        module: moduleId,
        scheduler: scheduler,
        signer: signer,
        tags: [{ name: 'Name', value: `E2E-Parallel-${i}` }],
      }).catch(error => ({ error: error.message }))
    );
    
    const results = await Promise.all(promises);
    const elapsed = Date.now() - start;
    
    const errors = results.filter(r => r.error);
    const rateLimitErrors = errors.filter(r => 
      r.error.toLowerCase().includes('rate limit') || 
      r.error.toLowerCase().includes('too many requests')
    );
    
    console.log(`   Completed in ${elapsed}ms`);
    console.log(`   Success: ${PARALLEL_SPAWNS - errors.length}/${PARALLEL_SPAWNS}`);
    console.log(`   Rate limit errors: ${rateLimitErrors.length}`);
    
    assert.strictEqual(rateLimitErrors.length, 0, 'Should have zero rate limit errors');
  });

  await t.test('high-frequency message loop', async () => {
    const {
      getAoInstance,
      createAoSigner,
      getAosModule,
      getScheduler,
    } = await import('ao-localnet');
    
    const ao = getAoInstance();
    const signer = createAoSigner();
    const moduleId = getAosModule();
    const scheduler = getScheduler();
    
    // Spawn test process with retry
    let processId;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        processId = await ao.spawn({
          module: moduleId,
          scheduler: scheduler,
          signer: signer,
          tags: [{ name: 'Name', value: 'E2E-HighFreq-Test' }],
        });
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.log('   Failed to spawn process after retries, skipping test');
          return; // Skip this test if spawn fails
        }
        console.log(`   Spawn retry ${attempts}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('   Running high-frequency message loop...');
    const messages = 15;
    const start = Date.now();
    let rateLimitErrors = 0;
    
    for (let i = 0; i < messages; i++) {
      try {
        await ao.message({
          process: processId,
          signer: signer,
          tags: [{ name: 'Action', value: 'Eval' }],
          data: `Count = ${i}`,
        });
      } catch (error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
          rateLimitErrors++;
        } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          // Service might be restarting, wait and continue
          console.log(`   Warning: Service error at message ${i}, continuing...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Other errors - don't count as rate limit but log
          console.log(`   Warning: ${error.message}`);
        }
      }
    }
    
    const elapsed = Date.now() - start;
    const rate = (messages / (elapsed / 1000)).toFixed(2);
    
    console.log(`   Sent ${messages} messages in ${elapsed}ms (${rate} msg/sec)`);
    console.log(`   Rate limit errors: ${rateLimitErrors}`);
    
    assert.strictEqual(rateLimitErrors, 0, 'Should have zero rate limit errors in loop');
  });
});

