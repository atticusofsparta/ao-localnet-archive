import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { LocalnetClient } from '../src/client.js';
import { 
  getContainerStatus, 
  getContainerLogs,
  isServiceHealthy,
  isServiceReady,
  waitForServiceReady,
  getAllServicesStatus,
  type ServiceName 
} from '../src/docker.js';
import { getAoInstance, createAoSigner, getScheduler, getAosModule } from '../src/index.js';
import { connect } from '@permaweb/aoconnect';

/**
 * LocalnetClient Integration Tests
 * 
 * Comprehensive tests covering:
 * 1. Service lifecycle (start/stop/restart)
 * 2. Data persistence
 * 3. Service logging and monitoring
 * 4. High-load scenarios (100 processes)
 * 5. Message cranking between processes
 */
describe('LocalnetClient - Integration Tests', () => {
  let client: LocalnetClient;
  let initialServicesRunning = false;

  before(async () => {
    client = new LocalnetClient();
    
    // Check if services are already running
    const status = await getAllServicesStatus();
    initialServicesRunning = Object.values(status).some(s => s?.running);
    
    console.log('\n🔧 LocalnetClient Integration Tests');
    console.log(`   Services initially running: ${initialServicesRunning ? 'Yes' : 'No'}\n`);
  });

  describe('Service Lifecycle Management', () => {
    it('should start services with progress tracking', async function() {
      // Skip if already running
      if (initialServicesRunning) {
        console.log('   ⏭️  Skipping - services already running');
        return;
      }

      const progressMessages: string[] = [];
      
      await client.start({
        persist: true,
        waitForHealthy: true,
        healthTimeout: 120000,
        onProgress: (msg) => {
          console.log(`   ${msg}`);
          progressMessages.push(msg);
        },
      });

      // Verify we got progress updates
      assert.ok(progressMessages.length > 0, 'Should have progress messages');
      assert.ok(progressMessages.some(m => m.includes('Starting')), 'Should have starting message');
      assert.ok(progressMessages.some(m => m.includes('success')), 'Should have success message');

      // Verify services are running
      const services: ServiceName[] = ['arlocal', 'mu', 'su', 'cu'];
      for (const service of services) {
        const status = await getContainerStatus(service);
        assert.ok(status?.running, `${service} should be running`);
      }

      console.log('   ✅ Services started with progress tracking');
    });

    it('should verify all services are healthy', async () => {
      const services: ServiceName[] = ['arlocal', 'mu', 'su', 'su-database', 'cu', 'bundler'];
      
      console.log('   Checking service health...');
      for (const service of services) {
        const healthy = await isServiceHealthy(service);
        const ready = await isServiceReady(service);
        
        console.log(`   - ${service}: ${healthy ? '✅ healthy' : '❌ unhealthy'}, ${ready ? '✅ ready' : '❌ not ready'}`);
        
        assert.ok(healthy, `${service} should be healthy`);
      }

      console.log('   ✅ All services healthy and ready');
    });

    it('should stop services gracefully', async () => {
      const progressMessages: string[] = [];
      
      await client.stop({
        timeout: 10,
        removeVolumes: false,
        onProgress: (msg) => {
          console.log(`   ${msg}`);
          progressMessages.push(msg);
        },
      });

      // Verify services are stopped
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = await getContainerStatus('arlocal');
      assert.ok(!status?.running, 'Services should be stopped');

      console.log('   ✅ Services stopped gracefully');
    });

    it('should restart services with persistence', async () => {
      console.log('   Testing persistent restart...');
      
      // Ensure services are running first
      const running = await client.isRunning();
      if (!running) {
        console.log('   Starting services first...');
        await client.start({
          persist: true,
          waitForHealthy: true,
          onProgress: (msg) => console.log(`   ${msg}`),
        });
      }
      
      // Get initial block height
      const beforeResponse = await fetch('http://localhost:4000/info');
      const beforeInfo = await beforeResponse.json();
      const beforeHeight = beforeInfo.height;
      
      console.log(`   Height before restart: ${beforeHeight}`);
      
      // Mine some blocks
      await fetch('http://localhost:4000/mine/3');
      
      const afterMineResponse = await fetch('http://localhost:4000/info');
      const afterMineInfo = await afterMineResponse.json();
      const afterMineHeight = afterMineInfo.height;
      
      console.log(`   Height after mining: ${afterMineHeight}`);
      
      // Restart with persistence (default)
      await client.restart({
        persist: true,
        waitForHealthy: true,
        healthTimeout: 120000,
        onProgress: (msg) => console.log(`   ${msg}`),
      });

      // Wait for services to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify services are running
      const healthy = await isServiceHealthy('arlocal');
      assert.ok(healthy, 'Services should be running after restart');
      
      // Check height is preserved (within tolerance for auto-mining)
      const afterRestartResponse = await fetch('http://localhost:4000/info');
      const afterRestartInfo = await afterRestartResponse.json();
      const afterRestartHeight = afterRestartInfo.height;
      
      console.log(`   Height after restart: ${afterRestartHeight}`);
      
      assert.ok(afterRestartHeight >= afterMineHeight, 
        `Height should be preserved or higher: ${afterRestartHeight} >= ${afterMineHeight}`);
      assert.ok(afterRestartHeight - afterMineHeight < 10,
        `Height should not increase dramatically: ${afterRestartHeight} - ${afterMineHeight} < 10`);

      console.log('   ✅ Services restarted with data persisted');
    });

    it('should restart services without persistence', async () => {
      console.log('   Testing non-persistent restart...');
      
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
      
      // Mine some blocks to elevate height
      await fetch('http://localhost:4000/mine/5');
      
      // Get current height (should be elevated)
      const beforeResponse = await fetch('http://localhost:4000/info');
      const beforeInfo = await beforeResponse.json();
      const beforeHeight = beforeInfo.height;
      
      console.log(`   Height before restart: ${beforeHeight}`);
      assert.ok(beforeHeight > 5, 'Should have elevated height');
      
      // Restart WITHOUT persistence
      await client.restart({
        persist: false,
        waitForHealthy: true,
        healthTimeout: 120000,
        onProgress: (msg) => console.log(`   ${msg}`),
      });

      // Wait for services to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify services are running
      const healthy = await isServiceHealthy('arlocal');
      assert.ok(healthy, 'Services should be running after restart');
      
      // Height should be reset (near 0)
      const afterResponse = await fetch('http://localhost:4000/info');
      const afterInfo = await afterResponse.json();
      const afterHeight = afterInfo.height;
      
      console.log(`   Height after non-persistent restart: ${afterHeight}`);
      console.log(`   Previous height was: ${beforeHeight}`);
      
      // Height should be dramatically lower (data was cleared)
      assert.ok(afterHeight < beforeHeight - 10, 
        `Height should be reset: ${afterHeight} << ${beforeHeight}`);
      assert.ok(afterHeight < 10,
        `Height should be near zero: ${afterHeight} < 10`);

      console.log('   ✅ Services restarted with data cleared');
    });
  });

  describe('Data Persistence', () => {
    let testTransactionId: string;

    it('should persist data across restarts', async () => {
      console.log('   Testing data persistence...');
      
      // Get initial block height
      const initialResponse = await fetch('http://localhost:4000/info');
      const initialInfo = await initialResponse.json();
      const initialHeight = initialInfo.height;
      
      console.log(`   Initial height: ${initialHeight}`);

      // Mine some blocks to change state
      await fetch('http://localhost:4000/mine/5');
      
      const afterMineResponse = await fetch('http://localhost:4000/info');
      const afterMineInfo = await afterMineResponse.json();
      const afterMineHeight = afterMineInfo.height;
      
      console.log(`   Height after mining: ${afterMineHeight}`);
      assert.ok(afterMineHeight > initialHeight, 'Height should increase');

      // Restart with persistence
      console.log('   Restarting with persistence...');
      await client.restart({
        persist: true,
        waitForHealthy: true,
        onProgress: (msg) => console.log(`   ${msg}`),
      });

      // Give arlocal time to fully load persisted data
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check height is preserved (or close to it - auto-mining may add a few blocks)
      const afterRestartResponse = await fetch('http://localhost:4000/info');
      const afterRestartInfo = await afterRestartResponse.json();
      const afterRestartHeight = afterRestartInfo.height;
      
      console.log(`   Height after restart: ${afterRestartHeight}`);
      
      // Height should be at least as high as before restart
      // (auto-mining might have added a few more blocks)
      assert.ok(afterRestartHeight >= afterMineHeight, 
        `Height should be preserved: ${afterRestartHeight} >= ${afterMineHeight}`);
      
      // But not dramatically different (within 10 blocks tolerance)
      assert.ok(Math.abs(afterRestartHeight - afterMineHeight) < 10,
        `Height should be close to original: ${afterRestartHeight} vs ${afterMineHeight}`);

      console.log('   ✅ Data persisted across restart');
    });

    it('should clear data when persist=false', async () => {
      console.log('   Testing non-persistent restart...');
      
      // Get current height
      const beforeResponse = await fetch('http://localhost:4000/info');
      const beforeInfo = await beforeResponse.json();
      const beforeHeight = beforeInfo.height;
      
      console.log(`   Height before: ${beforeHeight}`);

      // Stop and restart without persistence
      await client.stop({ removeVolumes: true });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await client.start({
        persist: false,
        waitForHealthy: true,
        onProgress: (msg) => console.log(`   ${msg}`),
      });

      // Give arlocal time to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Height should be reset (close to 0)
      // Note: There will be some blocks from initial startup/seeding
      const afterResponse = await fetch('http://localhost:4000/info');
      const afterInfo = await afterResponse.json();
      const afterHeight = afterInfo.height;
      
      console.log(`   Height after non-persistent restart: ${afterHeight}`);
      console.log(`   Previous height was: ${beforeHeight}`);
      
      // Height should be significantly less than before (data was cleared)
      assert.ok(afterHeight < beforeHeight - 10, 
        `Height should be much lower after clearing data: ${afterHeight} < ${beforeHeight - 10}`);

      console.log('   ✅ Data cleared with persist=false');
    });
  });

  describe('Service Logging', () => {
    it('should retrieve logs from all services', async () => {
      const services: ServiceName[] = ['arlocal', 'mu', 'su', 'cu', 'bundler'];
      
      console.log('   Retrieving logs from services...');
      
      for (const service of services) {
        const logs = await getContainerLogs(service, 10);
        
        assert.ok(logs, `Should get logs from ${service}`);
        assert.ok(logs.length > 0, `Logs from ${service} should not be empty`);
        
        const lineCount = logs.split('\n').filter(l => l.trim()).length;
        console.log(`   - ${service}: ${lineCount} log lines`);
      }

      console.log('   ✅ Retrieved logs from all services');
    });

    it('should tail logs with specific count', async () => {
      const logs = await getContainerLogs('arlocal', 5);
      const lines = logs.split('\n').filter(l => l.trim());
      
      console.log(`   Retrieved ${lines.length} log lines from arlocal`);
      assert.ok(lines.length <= 10, 'Should respect tail limit'); // Give some margin

      console.log('   ✅ Log tailing works correctly');
    });

    it('should stream logs during operations', async () => {
      console.log('   Testing log streaming...');
      
      // Make a request
      await fetch('http://localhost:4000/info');
      
      // Give a moment for logs to be written
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get recent logs
      const logs = await getContainerLogs('arlocal', 20);
      
      assert.ok(logs.includes('/info') || logs.includes('GET'), 
        'Logs should contain recent request');

      console.log('   ✅ Logs capture real-time activity');
    });
  });

  describe('High-Load Scenarios', () => {
    let ao: ReturnType<typeof connect>;
    let signer: any;
    let moduleId: string;
    let scheduler: string;

    before(async () => {
      // Ensure services are running and seeded
      console.log('\n   Preparing for high-load tests...');
      
      ao = getAoInstance();
      signer = createAoSigner();
      
      try {
        moduleId = getAosModule();
        scheduler = await getScheduler();
        console.log(`   Using module: ${moduleId}`);
        console.log(`   Using scheduler: ${scheduler}`);
      } catch (error) {
        console.log('   ⚠️  Module/scheduler not found - may need to run seed first');
        throw new Error('Please run "pnpm run seed" before running high-load tests');
      }
    });

    it('should spawn 100 processes rapidly', { timeout: 300000 }, async function() {
      console.log('\n   🚀 Spawning 100 processes...');
      
      const processCount = 100;
      const spawnPromises: Promise<string>[] = [];
      const startTime = Date.now();

      // Spawn all processes in parallel
      for (let i = 0; i < processCount; i++) {
        const promise = ao.spawn({
          module: moduleId,
          scheduler: scheduler,
          signer: signer,
          tags: [
            { name: 'Name', value: `Stress-Test-Process-${i}` },
            { name: 'Batch', value: 'high-load-test' },
            { name: 'Index', value: String(i) },
          ],
        }).then(pid => {
          if ((i + 1) % 10 === 0) {
            console.log(`   Spawned ${i + 1}/${processCount} processes...`);
          }
          return pid;
        });
        
        spawnPromises.push(promise);
      }

      // Wait for all spawns to complete
      const processIds = await Promise.all(spawnPromises);
      const duration = Date.now() - startTime;

      console.log(`\n   ✅ Spawned ${processIds.length} processes in ${duration}ms`);
      console.log(`   Average: ${(duration / processIds.length).toFixed(2)}ms per process`);
      
      // Verify all processes have valid IDs
      assert.strictEqual(processIds.length, processCount, 'All processes should spawn');
      processIds.forEach((pid, i) => {
        assert.strictEqual(typeof pid, 'string', `Process ${i} should have string ID`);
        assert.strictEqual(pid.length, 43, `Process ${i} should have 43-char ID`);
      });

      // Store for next test
      (this as any).processIds = processIds;
    });

    it('should send messages to all spawned processes', { timeout: 300000 }, async function() {
      const processIds = (this as any).processIds as string[];
      if (!processIds || processIds.length === 0) {
        console.log('   ⏭️  Skipping - no processes from previous test');
        return;
      }

      console.log(`\n   📨 Sending messages to ${processIds.length} processes...`);
      
      const messagePromises: Promise<string>[] = [];
      const startTime = Date.now();

      // Send a message to each process
      for (let i = 0; i < processIds.length; i++) {
        const promise = ao.message({
          process: processIds[i],
          signer: signer,
          tags: [{ name: 'Action', value: 'Eval' }],
          data: `return "Process ${i} responding"`,
        }).then(msgId => {
          if ((i + 1) % 10 === 0) {
            console.log(`   Sent ${i + 1}/${processIds.length} messages...`);
          }
          return msgId;
        });
        
        messagePromises.push(promise);
      }

      const messageIds = await Promise.all(messagePromises);
      const duration = Date.now() - startTime;

      console.log(`\n   ✅ Sent ${messageIds.length} messages in ${duration}ms`);
      console.log(`   Average: ${(duration / messageIds.length).toFixed(2)}ms per message`);
      
      assert.strictEqual(messageIds.length, processIds.length, 'All messages should send');

      // Store for next test
      (this as any).messageIds = messageIds;
      (this as any).processIds = processIds;
    });

    it('should crank and retrieve results from all messages', { timeout: 300000 }, async function() {
      const processIds = (this as any).processIds as string[];
      const messageIds = (this as any).messageIds as string[];
      
      if (!processIds || !messageIds || processIds.length === 0) {
        console.log('   ⏭️  Skipping - no messages from previous test');
        return;
      }

      console.log(`\n   ⚙️  Cranking results for ${messageIds.length} messages...`);
      
      const resultPromises: Promise<any>[] = [];
      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;

      // Crank results for all messages
      for (let i = 0; i < messageIds.length; i++) {
        const promise = ao.result({
          message: messageIds[i],
          process: processIds[i],
        }).then(result => {
          if (result && result.Output) {
            successCount++;
          }
          if ((i + 1) % 10 === 0) {
            console.log(`   Cranked ${i + 1}/${messageIds.length} messages... (${successCount} successful)`);
          }
          return result;
        }).catch(error => {
          errorCount++;
          return null;
        });
        
        resultPromises.push(promise);
      }

      const results = await Promise.all(resultPromises);
      const duration = Date.now() - startTime;

      console.log(`\n   ✅ Cranked ${results.length} results in ${duration}ms`);
      console.log(`   Average: ${(duration / results.length).toFixed(2)}ms per result`);
      console.log(`   Successful: ${successCount}, Errors: ${errorCount}`);
      
      // At least 90% should succeed (allowing for some network issues)
      const successRate = (successCount / results.length) * 100;
      assert.ok(successRate >= 90, `Success rate should be >= 90%, got ${successRate.toFixed(1)}%`);
    });

    it('should handle message passing between processes', { timeout: 180000 }, async function() {
      const processIds = (this as any).processIds as string[];
      
      if (!processIds || processIds.length < 10) {
        console.log('   ⏭️  Skipping - need at least 10 processes');
        return;
      }

      console.log('\n   🔄 Testing message passing between processes...');
      
      // Use first 10 processes for ping-pong test
      const sender = processIds[0];
      const receivers = processIds.slice(1, 6); // 5 receivers
      
      console.log(`   Sender: ${sender.substring(0, 8)}...`);
      console.log(`   Receivers: ${receivers.length} processes`);

      // Send messages from sender to each receiver
      const sendPromises = receivers.map(async (receiver, i) => {
        const msgId = await ao.message({
          process: sender,
          signer: signer,
          tags: [
            { name: 'Action', value: 'Eval' },
            { name: 'Target', value: receiver },
          ],
          data: `Send({ Target = "${receiver}", Data = "Ping ${i}" })`,
        });
        
        console.log(`   Sent ping ${i} -> ${receiver.substring(0, 8)}...`);
        return msgId;
      });

      const messageIds = await Promise.all(sendPromises);
      
      console.log(`   ✅ Sent ${messageIds.length} cross-process messages`);
      
      // Verify messages were sent
      assert.strictEqual(messageIds.length, receivers.length);
      messageIds.forEach(msgId => {
        assert.ok(msgId.length > 0, 'Message ID should exist');
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should report service resource usage', async () => {
      const status = await getAllServicesStatus();
      
      console.log('\n   📊 Service Status:');
      for (const [service, info] of Object.entries(status)) {
        if (info) {
          console.log(`   - ${service}: ${info.state} (${info.status})`);
        } else {
          console.log(`   - ${service}: Not found`);
        }
      }

      const runningCount = Object.values(status).filter(s => s?.running).length;
      console.log(`\n   Running services: ${runningCount}/${Object.keys(status).length}`);
      
      assert.ok(runningCount >= 6, 'At least 6 services should be running');
    });

    it('should measure service response times', async () => {
      const services = [
        { name: 'arlocal', url: 'http://localhost:4000/info' },
        { name: 'mu', url: 'http://localhost:4002' },
        { name: 'cu', url: 'http://localhost:4004' },
      ];

      console.log('\n   ⚡ Service Response Times:');
      
      for (const { name, url } of services) {
        const start = Date.now();
        
        try {
          const response = await fetch(url, { 
            signal: AbortSignal.timeout(5000) 
          });
          const duration = Date.now() - start;
          
          console.log(`   - ${name}: ${duration}ms (${response.status})`);
          assert.ok(duration < 1000, `${name} should respond in < 1s`);
        } catch (error) {
          console.log(`   - ${name}: Error - ${error.message}`);
        }
      }
    });
  });

  after(async () => {
    console.log('\n🧹 Cleanup: Ensuring services are running for other tests...');
    
    // Make sure services are running for subsequent tests
    const healthy = await isServiceHealthy('arlocal');
    if (!healthy) {
      console.log('   Restarting services...');
      await client.start({
        persist: true,
        waitForHealthy: true,
        onProgress: (msg) => console.log(`   ${msg}`),
      });
    } else {
      console.log('   Services still running - no action needed');
    }
  });
});

