#!/usr/bin/env node
/**
 * Mint AR tokens on localnet for testing
 * 
 * Usage: node mint-tokens.mjs <address> [amount]
 * Example: node mint-tokens.mjs 1nEDSZp5JilnSpbHIsA4V8YBwQmqnSL3-iQCvBJwAy4 1000000000000
 */

import Arweave from 'arweave';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const address = process.argv[2];
const amount = process.argv[3] || '1000000000000'; // 1 AR by default

if (!address) {
  console.error('❌ Please provide an address');
  console.error('Usage: node mint-tokens.mjs <address> [amount]');
  console.error('');
  console.error('Example:');
  console.error('  node mint-tokens.mjs 1nEDSZp5... 1000000000000');
  process.exit(1);
}

// Initialize localnet connection
const arweave = Arweave.init({
  host: 'localhost',
  port: 4000,
  protocol: 'http'
});

// Load wallet (needs to have tokens to send)
const walletPath = resolve(process.cwd(), 'wallets/ao-wallet.json');
const wallet = JSON.parse(readFileSync(walletPath, 'utf8'));

async function mintTokens() {
  try {
    console.log('💰 Minting tokens...');
    console.log(`   To: ${address}`);
    console.log(`   Amount: ${amount} winston (${(parseInt(amount) / 1e12).toFixed(4)} AR)`);
    console.log('');
    
    // Check current balance
    const balanceBefore = await arweave.wallets.getBalance(address);
    console.log(`   Balance before: ${balanceBefore} winston (${(parseInt(balanceBefore) / 1e12).toFixed(4)} AR)`);
    
    // Create transfer transaction
    const tx = await arweave.createTransaction({
      target: address,
      quantity: amount
    }, wallet);
    
    await arweave.transactions.sign(tx, wallet);
    await arweave.transactions.post(tx);
    
    console.log(`   Transaction: ${tx.id}`);
    console.log('   ⏳ Waiting for mining...');
    
    // Wait for transaction to be mined
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check new balance
    const balanceAfter = await arweave.wallets.getBalance(address);
    console.log(`   Balance after: ${balanceAfter} winston (${(parseInt(balanceAfter) / 1e12).toFixed(4)} AR)`);
    
    console.log('');
    console.log('✅ Tokens minted successfully!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Minting failed:', error.message);
    process.exit(1);
  }
}

mintTokens();

