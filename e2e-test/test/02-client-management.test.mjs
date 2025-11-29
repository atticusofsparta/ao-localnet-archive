#!/usr/bin/env node
/**
 * E2E Test 2: LocalnetClient Management
 * 
 * Tests that the LocalnetClient can manage Docker services
 * in a consumer project environment.
 */

import { test } from 'node:test';
import assert from 'node:assert';

test('E2E: LocalnetClient Management', async (t) => {
  let client;

  await t.test('can create LocalnetClient instance', async () => {
    const { LocalnetClient } = await import('ao-localnet/client');
    client = new LocalnetClient();
    
    assert.ok(client, 'Client should be created');
    assert.ok(typeof client.start === 'function', 'Client should have start method');
    assert.ok(typeof client.stop === 'function', 'Client should have stop method');
    assert.ok(typeof client.restart === 'function', 'Client should have restart method');
    assert.ok(typeof client.getStatus === 'function', 'Client should have getStatus method');
  });

  await t.test('can get service status', async () => {
    const status = await client.getStatus();
    
    assert.ok(status, 'Status should be returned');
    assert.ok(Array.isArray(status), 'Status should be an array');
    
    // Check for key services
    const serviceNames = status.map(s => s.service);
    assert.ok(serviceNames.includes('arlocal'), 'Should include arlocal');
    assert.ok(serviceNames.includes('mu'), 'Should include mu');
    assert.ok(serviceNames.includes('su'), 'Should include su');
    assert.ok(serviceNames.includes('cu'), 'Should include cu');
    
    console.log('   Services:', serviceNames.join(', '));
  });

  await t.test('can check if services are healthy', async () => {
    const status = await client.getStatus();
    const healthyServices = status.filter(s => s.healthy);
    
    console.log(`   Healthy: ${healthyServices.length}/${status.length}`);
    
    // Most services should be healthy (allowing some to be stopped)
    assert.ok(healthyServices.length > 0, 'At least some services should be healthy');
  });

  await t.test('can get logs from a service', async () => {
    const logs = await client.getLogs('mu', { tail: 10 });
    
    assert.ok(logs, 'Logs should be returned');
    assert.ok(typeof logs === 'string', 'Logs should be a string');
    
    console.log(`   MU logs (${logs.split('\n').length} lines)`);
  });

  await t.test('client restart works with options', async () => {
    console.log('   Testing restart with autoSeed...');
    
    // This should not throw
    await client.restart({
      persist: true,
      waitForHealthy: true,
      autoSeed: true,
      onProgress: (msg) => {
        // Suppress progress logs in test output
        // console.log('     ', msg);
      },
    });
    
    // Verify services are running after restart
    const status = await client.getStatus();
    const healthyServices = status.filter(s => s.healthy);
    
    console.log(`   After restart: ${healthyServices.length}/${status.length} healthy`);
    assert.ok(healthyServices.length >= 5, 'Most services should be healthy after restart');
  });
});

