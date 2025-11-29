import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { LocalnetClient } from '../src/client.js';
import { isServiceHealthy } from '../src/docker.js';

/**
 * Focused Restart Tests
 * Tests the restart functionality with both persist modes
 */
describe('LocalnetClient - Restart Tests', () => {
  let client: LocalnetClient;

  before(async () => {
    client = new LocalnetClient();
    console.log('\n🔄 Testing Restart Functionality\n');
  });

  it('should restart with persistence (default behavior)', async () => {
    console.log('📝 Test 1: Persistent Restart');
    console.log('   Ensuring services are running...');
    
    // Make sure services are running
    const running = await client.isRunning();
    if (!running) {
      await client.start({
        persist: true,
        waitForHealthy: true,
        onProgress: (msg) => console.log(`   ${msg}`),
      });
    }

    // Get initial state
    const beforeResponse = await fetch('http://localhost:4000/info');
    const beforeInfo = await beforeResponse.json();
    const beforeHeight = beforeInfo.height;
    
    console.log(`   Initial height: ${beforeHeight}`);

    // Mine blocks to create state
    console.log('   Mining 5 blocks...');
    await fetch('http://localhost:4000/mine/5');
    
    const afterMineResponse = await fetch('http://localhost:4000/info');
    const afterMineInfo = await afterMineResponse.json();
    const afterMineHeight = afterMineInfo.height;
    
    console.log(`   Height after mining: ${afterMineHeight}`);
    assert.ok(afterMineHeight > beforeHeight, 'Height should increase after mining');

    // Restart with persistence
    console.log('   Restarting with persist=true...');
    await client.restart({
      persist: true,
      waitForHealthy: true,
      healthTimeout: 120000,
      onProgress: (msg) => console.log(`   ${msg}`),
    });

    // Give time for services to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check services are healthy
    const healthy = await isServiceHealthy('arlocal');
    assert.ok(healthy, 'Services should be healthy after restart');
    
    // Check data was preserved
    const afterRestartResponse = await fetch('http://localhost:4000/info');
    const afterRestartInfo = await afterRestartResponse.json();
    const afterRestartHeight = afterRestartInfo.height;
    
    console.log(`   Height after restart: ${afterRestartHeight}`);
    
    // Data should be preserved (within tolerance for auto-mining)
    assert.ok(afterRestartHeight >= afterMineHeight, 
      `Height should be >= ${afterMineHeight}, got ${afterRestartHeight}`);
    
    // But not dramatically different (auto-mining might add a few blocks)
    const difference = Math.abs(afterRestartHeight - afterMineHeight);
    assert.ok(difference < 10, 
      `Height difference should be < 10 blocks, got ${difference}`);

    console.log('   ✅ Data persisted correctly!\n');
  });

  it('should restart without persistence and clear data', async () => {
    console.log('📝 Test 2: Non-Persistent Restart');
    
    // Ensure services are running
    const running = await client.isRunning();
    if (!running) {
      console.log('   Starting services first...');
      await client.start({
        persist: true,
        waitForHealthy: true,
        onProgress: (msg) => console.log(`   ${msg}`),
      });
    }

    // Create some state
    console.log('   Mining 10 blocks...');
    await fetch('http://localhost:4000/mine/10');
    
    const beforeResponse = await fetch('http://localhost:4000/info');
    const beforeInfo = await beforeResponse.json();
    const beforeHeight = beforeInfo.height;
    
    console.log(`   Height before restart: ${beforeHeight}`);
    assert.ok(beforeHeight >= 10, 'Should have elevated height');

    // Restart WITHOUT persistence
    console.log('   Restarting with persist=false...');
    await client.restart({
      persist: false,
      waitForHealthy: true,
      healthTimeout: 120000,
      onProgress: (msg) => console.log(`   ${msg}`),
    });

    // Give time for services to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check services are healthy
    const healthy = await isServiceHealthy('arlocal');
    assert.ok(healthy, 'Services should be healthy after restart');
    
    // Check data was cleared
    const afterResponse = await fetch('http://localhost:4000/info');
    const afterInfo = await afterResponse.json();
    const afterHeight = afterInfo.height;
    
    console.log(`   Height after restart: ${afterHeight}`);
    console.log(`   Previous height was: ${beforeHeight}`);
    
    // Data should be reset - height should be much lower
    assert.ok(afterHeight < beforeHeight - 5, 
      `Height should be reset: ${afterHeight} << ${beforeHeight}`);
    
    // Should be near genesis (allowing for initial setup)
    assert.ok(afterHeight < 10, 
      `Height should be < 10, got ${afterHeight}`);

    console.log('   ✅ Data cleared correctly!\n');
  });

  it('should preserve data on default restart (no options)', async () => {
    console.log('📝 Test 3: Default Restart (should persist)');
    
    // Ensure services are running
    const running = await client.isRunning();
    if (!running) {
      await client.start({ persist: true, waitForHealthy: true });
    }

    // Create state
    await fetch('http://localhost:4000/mine/3');
    
    const beforeResponse = await fetch('http://localhost:4000/info');
    const beforeInfo = await beforeResponse.json();
    const beforeHeight = beforeInfo.height;
    
    console.log(`   Height before restart: ${beforeHeight}`);

    // Restart with no options (should default to persist=true)
    console.log('   Restarting with default options...');
    await client.restart({
      waitForHealthy: true,
      onProgress: (msg) => console.log(`   ${msg}`),
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check data was preserved
    const afterResponse = await fetch('http://localhost:4000/info');
    const afterInfo = await afterResponse.json();
    const afterHeight = afterInfo.height;
    
    console.log(`   Height after restart: ${afterHeight}`);
    
    // Default should preserve data
    assert.ok(afterHeight >= beforeHeight - 2, 
      `Height should be preserved (within tolerance): ${afterHeight} >= ${beforeHeight - 2}`);

    console.log('   ✅ Default restart preserves data!\n');
  });

  it('should stop and then start services separately', async () => {
    console.log('📝 Test 4: Stop then Start (separate operations)');
    
    // Ensure services are running
    const running = await client.isRunning();
    if (!running) {
      console.log('   Starting services first...');
      await client.start({ persist: true, waitForHealthy: true });
    }

    // Create some state
    console.log('   Mining 5 blocks...');
    await fetch('http://localhost:4000/mine/5');
    
    const beforeResponse = await fetch('http://localhost:4000/info');
    const beforeInfo = await beforeResponse.json();
    const beforeHeight = beforeInfo.height;
    
    console.log(`   Height before stop: ${beforeHeight}`);

    // Stop services
    console.log('   Stopping services...');
    await client.stop({
      timeout: 10,
      removeVolumes: false,
      onProgress: (msg) => console.log(`   ${msg}`),
    });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify stopped
    const stoppedRunning = await client.isRunning();
    assert.ok(!stoppedRunning, 'Services should be stopped');
    console.log('   ✅ Services confirmed stopped');

    // Start services again
    console.log('   Starting services again...');
    await client.start({
      persist: true,
      waitForHealthy: true,
      onProgress: (msg) => console.log(`   ${msg}`),
    });

    // Wait for stabilization
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify running
    const restartedRunning = await client.isRunning();
    assert.ok(restartedRunning, 'Services should be running');
    
    // Check data was preserved
    const afterResponse = await fetch('http://localhost:4000/info');
    const afterInfo = await afterResponse.json();
    const afterHeight = afterInfo.height;
    
    console.log(`   Height after start: ${afterHeight}`);
    
    // Data should be preserved (within tolerance)
    assert.ok(afterHeight >= beforeHeight - 2, 
      `Height should be preserved: ${afterHeight} >= ${beforeHeight - 2}`);

    console.log('   ✅ Stop/Start cycle preserves data!\n');
  });
});

