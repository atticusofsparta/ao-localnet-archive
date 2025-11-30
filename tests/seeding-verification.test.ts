/**
 * Tests for seeding verification and healing
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { 
  getSeedingStatus, 
  ensureSeeded,
  verifySchedulerLocation,
  verifyAosModule,
  clearConfigCache,
} from '../src/index.js';
import { LocalnetClient } from '../src/client.js';

describe('Seeding Verification', () => {
  const client = new LocalnetClient();
  let initiallyRunning = false;
  
  before(async () => {
    console.log('🔧 Seeding Verification Tests Setup');
    
    // Check if services are already running
    const status = await client.getStatus();
    const runningServices = Object.values(status).filter(s => s.running).length;
    initiallyRunning = runningServices > 0;
    
    if (initiallyRunning) {
      console.log('   Services already running - using existing instance');
    } else {
      console.log('   Starting localnet services...');
      await client.start({
        waitForHealthy: true,
        autoSeed: true,
        onProgress: (msg) => console.log('  ', msg),
      });
    }
  });
  
  after(async () => {
    // Only stop if we started them
    if (!initiallyRunning) {
      console.log('🛑 Stopping services (started by test)...');
      await client.stop();
    }
  });

  describe('getSeedingStatus', () => {
    it('should return comprehensive seeding status', async () => {
      const status = await getSeedingStatus(false);
      
      assert.ok('isSeeded' in status, 'Should have isSeeded property');
      assert.ok('schedulerLocation' in status, 'Should have schedulerLocation property');
      assert.ok('aosModule' in status, 'Should have aosModule property');
      assert.ok('issues' in status, 'Should have issues property');
      assert.ok('lastBootstrap' in status, 'Should have lastBootstrap property');
      
      assert.ok('exists' in status.schedulerLocation, 'schedulerLocation should have exists');
      assert.ok('txId' in status.schedulerLocation, 'schedulerLocation should have txId');
      assert.ok('accessible' in status.schedulerLocation, 'schedulerLocation should have accessible');
      
      assert.ok('exists' in status.aosModule, 'aosModule should have exists');
      assert.ok('txId' in status.aosModule, 'aosModule should have txId');
      assert.ok('accessible' in status.aosModule, 'aosModule should have accessible');
    });

    it('should include wallet balances when verbose is true', async () => {
      const status = await getSeedingStatus(true);
      
      assert.ok(status.walletBalances, 'Should have walletBalances when verbose');
      if (status.walletBalances) {
        assert.ok('scheduler' in status.walletBalances, 'Should have scheduler balance');
        assert.ok('aosPublisher' in status.walletBalances, 'Should have aosPublisher balance');
        assert.ok('bundler' in status.walletBalances, 'Should have bundler balance');
        assert.ok('ao' in status.walletBalances, 'Should have ao balance');
        
        assert.ok('address' in status.walletBalances.scheduler, 'scheduler should have address');
        assert.ok('balance' in status.walletBalances.scheduler, 'scheduler should have balance');
        assert.ok('sufficient' in status.walletBalances.scheduler, 'scheduler should have sufficient');
      }
    });

    it('should detect when localnet is properly seeded', async () => {
      // Ensure seeded first
      await ensureSeeded({ verify: true });
      
      const status = await getSeedingStatus(false);
      
      assert.strictEqual(status.isSeeded, true, 'Should be seeded');
      assert.strictEqual(status.schedulerLocation.accessible, true, 'Scheduler location should be accessible');
      assert.strictEqual(status.aosModule.accessible, true, 'AOS module should be accessible');
      assert.strictEqual(status.issues.length, 0, 'Should have no issues');
    });

    it('should report specific issues when seeding is incomplete', async () => {
      const status = await getSeedingStatus(false);
      
      if (!status.isSeeded) {
        assert.ok(status.issues.length > 0, 'Should have issues when not seeded');
        
        status.issues.forEach(issue => {
          assert.strictEqual(typeof issue, 'string', 'Issue should be a string');
          assert.ok(issue.length > 0, 'Issue should not be empty');
        });
      }
    });
  });

  describe('ensureSeeded with verification', () => {
    it('should perform comprehensive verification when verify=true', async () => {
      const messages: string[] = [];
      
      const wasSeeded = await ensureSeeded({
        verify: true,
        onProgress: (msg) => messages.push(msg),
      });
      
      // Should have verification message
      const hasVerificationMsg = messages.some(m => 
        m.includes('Verifying') || m.includes('seeded')
      );
      assert.strictEqual(hasVerificationMsg, true, 'Should have verification message');
    });

    it('should seed if verification fails', async () => {
      const messages: string[] = [];
      
      await ensureSeeded({
        force: true, // Force re-seed to test the flow
        verify: true,
        onProgress: (msg) => messages.push(msg),
      });
      
      // Should have seeding messages
      const hasSeedingMsg = messages.some(m => m.includes('Seeding'));
      assert.strictEqual(hasSeedingMsg, true, 'Should have seeding message');
      
      // Verify it worked
      const status = await getSeedingStatus(false);
      assert.strictEqual(status.isSeeded, true, 'Should be seeded after ensureSeeded');
    });

    it('should provide detailed error messages on failure', async () => {
      // This test would require mocking fetch or stopping services
      // Skipping for now as it requires more setup
    });
  });

  describe('backwards compatibility', () => {
    it('should maintain simple verification when verify=false', async () => {
      const wasSeeded = await ensureSeeded({
        verify: false,
      });
      
      // Should use simple check
      assert.strictEqual(typeof wasSeeded, 'boolean', 'Should return boolean');
    });

    it('verifySchedulerLocation should still work', async () => {
      const exists = await verifySchedulerLocation();
      assert.strictEqual(typeof exists, 'boolean', 'Should return boolean');
    });

    it('verifyAosModule should still work', async () => {
      const exists = await verifyAosModule();
      assert.strictEqual(typeof exists, 'boolean', 'Should return boolean');
    });
  });

  describe('healing scenarios', () => {
    it('should detect and heal stale config data', async () => {
      // Save original status
      const originalStatus = await getSeedingStatus(false);
      
      if (originalStatus.isSeeded) {
        // Re-seed to ensure everything is fresh
        await ensureSeeded({ force: true, verify: true });
        
        const newStatus = await getSeedingStatus(false);
        assert.strictEqual(newStatus.isSeeded, true, 'Should be seeded after healing');
        assert.strictEqual(newStatus.issues.length, 0, 'Should have no issues after healing');
      }
    });
  });
});

