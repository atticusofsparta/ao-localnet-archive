/**
 * Example: E2E Test with Docker Management
 * 
 * This example demonstrates how to use the Docker management
 * functions in E2E tests to ensure services are ready before
 * running tests.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert';
import {
  getAoInstance,
  createAoSigner,
  getScheduler,
  getAosModule,
  waitForAllServices,
  isServiceReady,
  getHealthStatus,
  restartService,
  waitForServiceReady,
  getContainerLogs,
} from '../dist/index.js';

// Global setup: Wait for all services to be ready
before(async () => {
  console.log('🔧 Setting up E2E test environment...');
  
  // Wait for all services to be healthy (max 90 seconds)
  console.log('⏳ Waiting for all services to be ready...');
  const allReady = await waitForAllServices(90000);
  
  if (!allReady) {
    console.error('❌ Services not ready in time. Checking status:');
    const health = await getHealthStatus();
    health.forEach(h => {
      const icon = h.healthy ? '✅' : '❌';
      console.log(`   ${icon} ${h.service}: ${h.status}`);
    });
    throw new Error('Services not ready for testing');
  }
  
  console.log('✅ All services ready!\n');
});

// Test suite
test('E2E Test Suite with Docker Management', async (t) => {
  
  await t.test('should verify all services are healthy', async () => {
    const health = await getHealthStatus();
    const allHealthy = health.every(h => h.healthy);
    
    assert.ok(allHealthy, 'All services should be healthy');
    console.log('✅ All services are healthy');
  });

  await t.test('should verify MU is accessible', async () => {
    const muReady = await isServiceReady('mu');
    assert.ok(muReady, 'MU should be ready');
    console.log('✅ MU is accessible');
  });

  await t.test('should spawn a process', async () => {
    const ao = getAoInstance();
    const signer = createAoSigner();
    const schedulerId = getScheduler();
    const moduleId = getAosModule();
    
    console.log('Spawning process...');
    const processId = await ao.spawn({
      module: moduleId,
      scheduler: schedulerId,
      signer,
      tags: [
        { name: 'Name', value: 'Test Process' },
        { name: 'Test-Type', value: 'E2E-Docker' },
      ],
    });
    
    assert.ok(processId, 'Process ID should be returned');
    console.log(`✅ Process spawned: ${processId}`);
  });

  await t.test('should handle service logs', async () => {
    // Get recent MU logs
    const logs = await getContainerLogs('mu', 20);
    
    assert.ok(logs, 'Should get logs from MU');
    assert.ok(logs.length > 0, 'Logs should not be empty');
    
    console.log('✅ Successfully retrieved service logs');
  });

  // Example: Test with service restart (useful for resilience testing)
  await t.test('should handle service restart (example)', async () => {
    // This test demonstrates how you could test resilience
    // Uncomment to actually test service restart
    
    console.log('Example: Service restart test');
    console.log('  1. Restart service: await restartService("mu")');
    console.log('  2. Wait for ready: await waitForServiceReady("mu")');
    console.log('  3. Verify operations still work');
    console.log('✅ Service restart example documented');
  });
});

// Global teardown
after(() => {
  console.log('\n🎉 E2E tests completed!');
});

