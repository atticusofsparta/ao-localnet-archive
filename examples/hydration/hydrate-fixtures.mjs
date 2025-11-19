#!/usr/bin/env node
/**
 * Hydrate multiple fixtures from mainnet to localnet
 * Edit the FIXTURES object below to customize what gets hydrated
 */

import Arweave from 'arweave';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Configure your fixtures here
const FIXTURES = {
  modules: {
    'aos-2.0': 'cbn0KKrBZH7hdNkNokuXLtGryrWM--PjSTBqIzw9Kkk',
    // Add more modules as needed
    // 'my-custom-module': 'YOUR-MODULE-ID-HERE',
  },
  transactions: {
    // Add transactions you want to hydrate
    // 'my-data': 'YOUR-TX-ID-HERE',
  }
};

// Initialize connections
const mainnet = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

const localnet = Arweave.init({
  host: 'localhost',
  port: 4000,
  protocol: 'http'
});

// Load wallet
const walletPath = resolve(process.cwd(), 'wallets/ao-wallet.json');
const wallet = JSON.parse(readFileSync(walletPath, 'utf8'));

async function hydrateTransaction(txId, name, type) {
  try {
    console.log(`\n📥 Hydrating ${name} (${type})...`);
    console.log(`   Source: ${txId}`);
    
    // Fetch transaction metadata
    const tx = await mainnet.transactions.get(txId);
    
    // Fetch data
    const response = await fetch(`https://arweave.net/${txId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const data = Buffer.from(await response.arrayBuffer());
    console.log(`   Size: ${(data.length / 1024).toFixed(2)} KB`);
    
    // Create on localnet
    const newTx = await localnet.createTransaction({ data }, wallet);
    
    // Copy tags
    tx.tags.forEach(tag => {
      const key = tag.get('name', { decode: true, string: true });
      const value = tag.get('value', { decode: true, string: true });
      newTx.addTag(key, value);
    });
    
    // Add tracking tags
    newTx.addTag('Original-ID', txId);
    newTx.addTag('Fixture-Name', name);
    newTx.addTag('Fixture-Type', type);
    newTx.addTag('Hydrated-From', 'https://arweave.net');
    newTx.addTag('Hydrated-At', new Date().toISOString());
    
    // Sign and post
    await localnet.transactions.sign(newTx, wallet);
    await localnet.transactions.post(newTx);
    
    console.log(`   ✅ Hydrated: ${newTx.id}`);
    return { name, originalId: txId, localnetId: newTx.id, type };
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { name, originalId: txId, error: error.message, type };
  }
}

async function hydrateAll() {
  console.log('🌊 Starting fixture hydration...');
  console.log('');
  
  const results = {
    modules: {},
    transactions: {},
    hydrated_at: new Date().toISOString()
  };
  
  // Hydrate modules
  for (const [name, txId] of Object.entries(FIXTURES.modules)) {
    const result = await hydrateTransaction(txId, name, 'module');
    if (result.localnetId) {
      results.modules[name] = result.localnetId;
    }
    // Wait a bit between hydrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Hydrate transactions
  for (const [name, txId] of Object.entries(FIXTURES.transactions)) {
    const result = await hydrateTransaction(txId, name, 'transaction');
    if (result.localnetId) {
      results.transactions[name] = result.localnetId;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Save results
  const outputPath = resolve(process.cwd(), 'hydrated-fixtures.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log('');
  console.log('✅ Hydration complete!');
  console.log('');
  console.log(`📄 Results saved to: hydrated-fixtures.json`);
  console.log('');
  console.log('Hydrated fixtures:');
  Object.entries(results.modules).forEach(([name, id]) => {
    console.log(`   📦 ${name}: ${id}`);
  });
  Object.entries(results.transactions).forEach(([name, id]) => {
    console.log(`   📄 ${name}: ${id}`);
  });
  console.log('');
  console.log('💡 Use these IDs in your code:');
  console.log('   const fixtures = require("./hydrated-fixtures.json");');
  console.log('   const moduleId = fixtures.modules["aos-2.0"];');
}

hydrateAll().catch(error => {
  console.error('');
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

