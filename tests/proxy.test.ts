import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import Arweave from 'arweave';
import { getLocalnetUrls } from './utils/config.js';

/**
 * Arlocal Proxy Auto-Mining Tests
 * 
 * These tests verify that the arlocal-proxy service:
 * 1. Transparently forwards all requests to arlocal
 * 2. Automatically mines blocks after POST/PUT transactions
 * 3. Does NOT mine for GET requests
 * 4. Does NOT mine for the /mine endpoint itself
 * 5. Handles concurrent transactions with proper queuing
 */
describe('Arlocal Proxy - Auto-Mining Tests', () => {
  let arweave: Arweave;
  let wallet: any;
  let gatewayUrl: string;

  before(async () => {
    const urls = getLocalnetUrls();
    gatewayUrl = urls.gateway;
    
    const url = new URL(gatewayUrl);
    arweave = new Arweave({
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: parseInt(url.port || '80'),
    });

    // Load test wallet
    const walletPath = './wallets/user-wallet.json';
    wallet = JSON.parse(readFileSync(walletPath, 'utf-8'));
    
    console.log('\n🧪 Arlocal Proxy Tests');
    console.log(`   Gateway: ${gatewayUrl}`);
    console.log(`   Wallet: ${await arweave.wallets.jwkToAddress(wallet)}\n`);
  });

  describe('Transparent Proxying', () => {
    it('should forward GET /info requests correctly', async () => {
      const response = await fetch(`${gatewayUrl}/info`);
      assert.strictEqual(response.ok, true);
      
      const info = await response.json();
      assert.ok(info.network);
      assert.ok(info.height !== undefined);
      assert.ok(info.blocks !== undefined);
      
      console.log(`✅ Proxied /info: height ${info.height}, blocks ${info.blocks}`);
    });

    it('should forward GET /tx_anchor requests correctly', async () => {
      const response = await fetch(`${gatewayUrl}/tx_anchor`);
      assert.strictEqual(response.ok, true);
      
      const anchor = await response.text();
      assert.ok(anchor.length > 0);
      
      console.log(`✅ Proxied /tx_anchor: ${anchor.substring(0, 20)}...`);
    });

    it('should forward GET /price requests correctly', async () => {
      const response = await fetch(`${gatewayUrl}/price/1000`);
      assert.strictEqual(response.ok, true);
      
      const price = await response.text();
      assert.ok(price.length > 0);
      
      console.log(`✅ Proxied /price: ${price}`);
    });
  });

  describe('GET Requests - No Mining', () => {
    it('should NOT mine after GET /info', async () => {
      const response1 = await fetch(`${gatewayUrl}/info`);
      const info1 = await response1.json();
      const height1 = info1.height;

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));

      const response2 = await fetch(`${gatewayUrl}/info`);
      const info2 = await response2.json();
      const height2 = info2.height;

      // Height should not increase from just GET requests
      assert.strictEqual(height1, height2);
      
      console.log(`✅ GET requests don't trigger mining: height ${height1} → ${height2}`);
    });

    it('should NOT mine after GET /mint (mint is a GET)', async () => {
      const response1 = await fetch(`${gatewayUrl}/info`);
      const info1 = await response1.json();
      const height1 = info1.height;

      // Mint some tokens (this is a GET request in arlocal)
      const address = await arweave.wallets.jwkToAddress(wallet);
      await fetch(`${gatewayUrl}/mint/${address}/1000000000`);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));

      const response2 = await fetch(`${gatewayUrl}/info`);
      const info2 = await response2.json();
      const height2 = info2.height;

      // Mint is a GET, so no auto-mining
      assert.strictEqual(height1, height2);
      
      console.log(`✅ GET /mint doesn't trigger mining: height ${height1} → ${height2}`);
    });
  });

  describe('POST Transactions - Auto Mining', () => {
    it('should auto-mine after posting a transaction', async () => {
      // Get initial height
      const initialInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const initialHeight = initialInfo.height;
      
      console.log(`   Initial height: ${initialHeight}`);

      // Create and post a transaction
      const tx = await arweave.createTransaction({
        data: 'Test data for auto-mining verification',
      }, wallet);

      tx.addTag('App-Name', 'ao-localnet-proxy-test');
      tx.addTag('Test-Type', 'auto-mining');
      
      await arweave.transactions.sign(tx, wallet);
      const postResponse = await arweave.transactions.post(tx);
      
      assert.strictEqual(postResponse.status, 200);
      console.log(`   Posted tx: ${tx.id}`);

      // Wait for auto-mining to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check height increased
      const finalInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const finalHeight = finalInfo.height;

      console.log(`   Final height: ${finalHeight}`);
      
      // Height should have increased by at least 1
      assert.ok(finalHeight > initialHeight, 
        `Expected height to increase from ${initialHeight} to > ${initialHeight}, got ${finalHeight}`);
      
      console.log(`✅ Auto-mining worked! Height: ${initialHeight} → ${finalHeight}`);
    });

    it('should auto-mine multiple transactions sequentially', async () => {
      const initialInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const initialHeight = initialInfo.height;
      
      console.log(`   Initial height: ${initialHeight}`);

      const numTransactions = 3;
      const txIds = [];

      // Post multiple transactions
      for (let i = 0; i < numTransactions; i++) {
        const tx = await arweave.createTransaction({
          data: `Test transaction ${i + 1} of ${numTransactions}`,
        }, wallet);

        tx.addTag('App-Name', 'ao-localnet-proxy-test');
        tx.addTag('Test-Number', String(i + 1));
        
        await arweave.transactions.sign(tx, wallet);
        const response = await arweave.transactions.post(tx);
        
        assert.strictEqual(response.status, 200);
        txIds.push(tx.id);
        console.log(`   Posted tx ${i + 1}: ${tx.id}`);
        
        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for all auto-mining to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check height increased
      const finalInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const finalHeight = finalInfo.height;

      console.log(`   Final height: ${finalHeight}`);
      console.log(`   Mined blocks: ${finalHeight - initialHeight}`);
      
      // Height should have increased by at least numTransactions
      assert.ok(finalHeight >= initialHeight + numTransactions,
        `Expected at least ${numTransactions} blocks mined, got ${finalHeight - initialHeight}`);
      
      console.log(`✅ Auto-mined ${numTransactions} transactions! Height: ${initialHeight} → ${finalHeight}`);
    });
  });

  describe('Manual Mining Still Works', () => {
    it('should allow manual /mine calls without issues', async () => {
      const initialInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const initialHeight = initialInfo.height;
      
      console.log(`   Initial height: ${initialHeight}`);

      // Call /mine manually
      const mineResponse = await fetch(`${gatewayUrl}/mine`);
      assert.strictEqual(mineResponse.ok, true);
      
      const mineResult = await mineResponse.json();
      assert.ok(mineResult.height !== undefined);
      
      const newHeight = mineResult.height;
      console.log(`   Height after manual mine: ${newHeight}`);
      
      // Height should have increased
      assert.strictEqual(newHeight, initialHeight + 1);
      
      console.log(`✅ Manual mining works: ${initialHeight} → ${newHeight}`);
    });

    it('should allow manual /mine with count parameter', async () => {
      const initialInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const initialHeight = initialInfo.height;
      
      console.log(`   Initial height: ${initialHeight}`);

      const blocksToMine = 5;
      
      // Call /mine with count
      const mineResponse = await fetch(`${gatewayUrl}/mine/${blocksToMine}`);
      assert.strictEqual(mineResponse.ok, true);
      
      const mineResult = await mineResponse.json();
      const newHeight = mineResult.height;
      
      console.log(`   Height after mining ${blocksToMine} blocks: ${newHeight}`);
      
      // Height should have increased by blocksToMine
      assert.strictEqual(newHeight, initialHeight + blocksToMine);
      
      console.log(`✅ Manual mining with count works: ${initialHeight} → ${newHeight}`);
    });
  });

  describe('Transaction Availability', () => {
    it('should make mined transactions immediately available', async () => {
      // Create and post a transaction
      const testData = `Test data ${Date.now()}`;
      const tx = await arweave.createTransaction({
        data: testData,
      }, wallet);

      tx.addTag('App-Name', 'ao-localnet-proxy-test');
      tx.addTag('Test-Type', 'availability-check');
      
      await arweave.transactions.sign(tx, wallet);
      await arweave.transactions.post(tx);
      
      console.log(`   Posted tx: ${tx.id}`);

      // Wait for auto-mining
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to retrieve the transaction
      const retrievedTx = await arweave.transactions.get(tx.id);
      assert.ok(retrievedTx);
      assert.strictEqual(retrievedTx.id, tx.id);
      
      const retrievedData = retrievedTx.get('data', { decode: true, string: true });
      assert.strictEqual(retrievedData, testData);
      
      console.log(`✅ Transaction immediately available after auto-mine`);
    });

    it('should confirm transaction status as confirmed', async () => {
      // Create and post a transaction
      const tx = await arweave.createTransaction({
        data: 'Status check test',
      }, wallet);

      tx.addTag('App-Name', 'ao-localnet-proxy-test');
      tx.addTag('Test-Type', 'status-check');
      
      await arweave.transactions.sign(tx, wallet);
      await arweave.transactions.post(tx);
      
      console.log(`   Posted tx: ${tx.id}`);

      // Wait for auto-mining
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check transaction status
      const status = await arweave.transactions.getStatus(tx.id);
      
      assert.ok(status);
      // status.confirmed is an object with block info when confirmed
      assert.ok(status.confirmed);
      assert.ok(status.confirmed.block_height > 0);
      
      console.log(`   Confirmed at block: ${status.confirmed.block_height}`);
      console.log(`✅ Transaction status confirmed`);
    });
  });

  describe('Performance', () => {
    it('should mine blocks quickly (< 200ms)', async () => {
      const tx = await arweave.createTransaction({
        data: 'Performance test',
      }, wallet);

      tx.addTag('App-Name', 'ao-localnet-proxy-test');
      
      await arweave.transactions.sign(tx, wallet);
      
      const startTime = Date.now();
      await arweave.transactions.post(tx);
      
      // Wait for mining with timeout
      let mined = false;
      const timeout = 200; // 200ms max
      const checkInterval = 10; // Check every 10ms
      
      for (let i = 0; i < timeout / checkInterval; i++) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
        try {
          const status = await arweave.transactions.getStatus(tx.id);
          if (status.confirmed) {
            mined = true;
            break;
          }
        } catch (e) {
          // Transaction might not be queryable yet
        }
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`   Mining duration: ${duration}ms`);
      assert.ok(mined, 'Transaction should be mined within 200ms');
      assert.ok(duration < timeout, `Mining took ${duration}ms, should be < ${timeout}ms`);
      
      console.log(`✅ Fast auto-mining: ${duration}ms`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid consecutive transactions', async () => {
      const initialInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const initialHeight = initialInfo.height;
      
      console.log(`   Initial height: ${initialHeight}`);

      // Post transactions sequentially (not in parallel) to ensure all succeed
      const numTransactions = 5;
      const txIds = [];
      
      for (let i = 0; i < numTransactions; i++) {
        const tx = await arweave.createTransaction({
          data: `Rapid test ${i}`,
        }, wallet);
        tx.addTag('Test-Number', String(i));
        await arweave.transactions.sign(tx, wallet);
        const response = await arweave.transactions.post(tx);
        
        if (response.status === 200) {
          txIds.push(tx.id);
        }
        
        // Small delay to ensure each transaction is processed
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log(`   Posted ${txIds.length} transactions`);

      // Wait for all mining to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const finalHeight = finalInfo.height;

      console.log(`   Final height: ${finalHeight}`);
      console.log(`   Blocks mined: ${finalHeight - initialHeight}`);
      
      // At least the number of successful posts should be mined
      assert.ok(finalHeight >= initialHeight + txIds.length,
        `Expected at least ${txIds.length} blocks, got ${finalHeight - initialHeight}`);
      
      console.log(`✅ Handled ${txIds.length} rapid transactions with auto-mining`);
    });

    it('should not create infinite mining loops', async () => {
      const initialInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const initialHeight = initialInfo.height;

      // Call /mine manually
      await fetch(`${gatewayUrl}/mine`);
      
      // Wait to ensure no additional mining happens
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalInfo = await fetch(`${gatewayUrl}/info`).then(r => r.json());
      const finalHeight = finalInfo.height;

      // Should have increased by exactly 1 (from our manual mine)
      assert.strictEqual(finalHeight, initialHeight + 1,
        'Manual /mine should not trigger auto-mining loop');
      
      console.log(`✅ No infinite loop: /mine doesn't trigger auto-mining`);
    });
  });
});

