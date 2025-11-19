#!/usr/bin/env node
/**
 * Hydrate a WASM module from mainnet to localnet
 * 
 * Usage: node hydrate-module.mjs <module-id>
 * Example: node hydrate-module.mjs cbn0KKrBZH7hdNkNokuXLtGryrWM--PjSTBqIzw9Kkk
 */

import Arweave from 'arweave';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const moduleId = process.argv[2];

if (!moduleId) {
  console.error('❌ Please provide a module ID');
  console.error('Usage: node hydrate-module.mjs <module-id>');
  process.exit(1);
}

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

async function hydrateModule() {
  try {
    console.log(`📥 Fetching module ${moduleId} from mainnet...`);
    
    // Fetch transaction metadata
    const tx = await mainnet.transactions.get(moduleId);
    console.log(`   Found ${tx.tags.length} tags`);
    
    // Fetch transaction data
    console.log('   Downloading data...');
    const response = await fetch(`https://arweave.net/${moduleId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    const data = Buffer.from(await response.arrayBuffer());
    console.log(`   Size: ${(data.length / 1024).toFixed(2)} KB`);
    
    // Create transaction on localnet
    console.log('📝 Creating transaction on localnet...');
    const newTx = await localnet.createTransaction({ data }, wallet);
    
    // Copy all tags
    console.log('🏷️  Copying tags...');
    tx.tags.forEach(tag => {
      const key = tag.get('name', { decode: true, string: true });
      const value = tag.get('value', { decode: true, string: true });
      newTx.addTag(key, value);
    });
    
    // Add tracking tags
    newTx.addTag('Original-Module-ID', moduleId);
    newTx.addTag('Hydrated-From', 'https://arweave.net');
    newTx.addTag('Hydrated-At', new Date().toISOString());
    
    // Sign and post
    console.log('🔐 Signing transaction...');
    await localnet.transactions.sign(newTx, wallet);
    
    console.log('📤 Posting to localnet...');
    await localnet.transactions.post(newTx);
    
    // Wait for it to be available
    console.log('⏳ Waiting for transaction to be mined...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify
    const status = await localnet.transactions.getStatus(newTx.id);
    if (status.status === 200) {
      console.log('');
      console.log('✅ Module hydrated successfully!');
      console.log('');
      console.log(`   Original ID: ${moduleId}`);
      console.log(`   Localnet ID: ${newTx.id}`);
      console.log('');
      console.log('💡 Use the localnet ID when spawning processes:');
      console.log(`   npx ao-localnet spawn "myprocess" --module ${newTx.id}`);
      
      return newTx.id;
    } else {
      throw new Error(`Transaction not confirmed: ${status.status}`);
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Hydration failed:', error.message);
    process.exit(1);
  }
}

hydrateModule();

