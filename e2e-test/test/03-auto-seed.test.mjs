#!/usr/bin/env node
/**
 * E2E Test 3: Auto-Seeding
 * 
 * Tests that auto-seeding works correctly when the package
 * is used as a dependency.
 */

import { test } from 'node:test';
import assert from 'node:assert';

test('E2E: Auto-Seeding', async (t) => {
  await t.test('can verify scheduler location', async () => {
    const { verifySchedulerLocation } = await import('ao-localnet');
    
    const exists = await verifySchedulerLocation(true);
    
    assert.ok(typeof exists === 'boolean', 'Should return a boolean');
    console.log('   Scheduler location exists:', exists);
  });

  await t.test('can verify AOS module', async () => {
    const { verifyAosModule } = await import('ao-localnet');
    
    const exists = await verifyAosModule(true);
    
    assert.ok(typeof exists === 'boolean', 'Should return a boolean');
    console.log('   AOS module exists:', exists);
  });

  await t.test('ensureSeeded function works', async () => {
    const { ensureSeeded } = await import('ao-localnet');
    
    const messages = [];
    const wasSeeded = await ensureSeeded({
      force: false,
      onProgress: (msg) => messages.push(msg),
    });
    
    assert.ok(typeof wasSeeded === 'boolean', 'Should return a boolean');
    console.log('   Seeding performed:', wasSeeded);
    console.log('   Progress messages:', messages.length);
    
    if (messages.length > 0) {
      console.log('   Last message:', messages[messages.length - 1]);
    }
  });

  await t.test('can spawn process with auto-seeded data', async () => {
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
    
    // Retry spawn if it fails (service might be starting)
    let processId;
    let attempts = 0;
    const maxAttempts = 3;
    
    console.log('   Spawning test process...');
    while (attempts < maxAttempts) {
      try {
        processId = await ao.spawn({
          module: moduleId,
          scheduler: scheduler,
          signer: signer,
          tags: [{ name: 'Name', value: 'E2E-AutoSeed-Test' }],
        });
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        console.log(`   Retry ${attempts}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    assert.ok(processId, 'Process should be spawned');
    assert.ok(typeof processId === 'string', 'Process ID should be a string');
    console.log('   ✅ Process created:', processId);
    
    // Send a message with retry
    console.log('   Sending test message...');
    attempts = 0;
    let messageId;
    
    while (attempts < maxAttempts) {
      try {
        messageId = await ao.message({
          process: processId,
          signer: signer,
          tags: [{ name: 'Action', value: 'Eval' }],
          data: 'return "E2E test successful!"',
        });
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        console.log(`   Retry ${attempts}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    assert.ok(messageId, 'Message should be sent');
    console.log('   ✅ Message sent:', messageId);
  });

  await t.test('LocalnetClient auto-seeds on start', async () => {
    const { LocalnetClient } = await import('ao-localnet/client');
    const client = new LocalnetClient();
    
    console.log('   Testing client.start with autoSeed...');
    
    const messages = [];
    await client.start({
      waitForHealthy: true,
      autoSeed: true,
      onProgress: (msg) => {
        if (msg.includes('seed')) {
          messages.push(msg);
        }
      },
    });
    
    console.log('   Seed-related messages:', messages.length);
    if (messages.length > 0) {
      console.log('   Sample:', messages[0]);
    }
    
    // Verify services are running
    const status = await client.getStatus();
    const healthyCount = Object.values(status).filter(s => s.healthy).length;
    const totalCount = Object.keys(status).length;
    console.log(`   Services healthy: ${healthyCount}/${totalCount}`);
    
    assert.ok(healthyCount >= 5, 'Most services should be healthy');
  });
});

