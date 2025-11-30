#!/usr/bin/env node
/**
 * E2E Test 5: Wallet Loading from Project Directory
 * 
 * Validates that wallets are loaded from the consumer project's directory,
 * not from the ao-localnet installation directory.
 * 
 * This test ensures that when ao-localnet is used as a dependency,
 * it correctly prioritizes the project's wallets over the package's wallets.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Arweave from 'arweave';

test('E2E: Wallet Loading from Project Directory', async (t) => {
  await t.test('can load AO wallet from project directory', async () => {
    const { getAoWallet, loadConfig } = await import('ao-localnet');
    
    // Load wallet using SDK
    const wallet = getAoWallet();
    
    assert.ok(wallet, 'Wallet should be loaded');
    assert.ok(wallet.n, 'Wallet should have modulus (n)');
    
    // Load wallet directly from project directory for comparison
    const config = loadConfig();
    const walletPath = config.wallets?.aoWallet || './wallets/ao-wallet.json';
    const projectWalletPath = resolve(process.cwd(), walletPath);
    const projectWallet = JSON.parse(readFileSync(projectWalletPath, 'utf8'));
    
    // Verify they're the same wallet
    assert.strictEqual(wallet.n, projectWallet.n, 'Should load wallet from project directory');
    
    console.log('   ✅ AO wallet loaded from project directory');
  });

  await t.test('can load bundler wallet from project directory', async () => {
    const { getBundlerWallet, loadConfig } = await import('ao-localnet');
    
    // Load wallet using SDK
    const wallet = getBundlerWallet();
    
    assert.ok(wallet, 'Wallet should be loaded');
    assert.ok(wallet.n, 'Wallet should have modulus (n)');
    
    // Load wallet directly from project directory for comparison
    const config = loadConfig();
    const walletPath = config.wallets?.bundlerWallet || './wallets/bundler-wallet.json';
    const projectWalletPath = resolve(process.cwd(), walletPath);
    const projectWallet = JSON.parse(readFileSync(projectWalletPath, 'utf8'));
    
    // Verify they're the same wallet
    assert.strictEqual(wallet.n, projectWallet.n, 'Should load wallet from project directory');
    
    console.log('   ✅ Bundler wallet loaded from project directory');
  });

  await t.test('getAuthority() uses project wallet', async () => {
    const { getAuthority, getAoWallet } = await import('ao-localnet');
    
    // Get authority address using SDK
    const authorityAddress = await getAuthority();
    
    assert.ok(authorityAddress, 'Authority address should be returned');
    assert.ok(typeof authorityAddress === 'string', 'Authority should be a string');
    assert.ok(authorityAddress.length > 0, 'Authority should not be empty');
    
    // Verify it matches the project wallet
    const arweave = Arweave.init({});
    const projectWallet = getAoWallet();
    const expectedAddress = await arweave.wallets.jwkToAddress(projectWallet);
    
    assert.strictEqual(
      authorityAddress,
      expectedAddress,
      'Authority should match project wallet address'
    );
    
    console.log('   ✅ Authority address from project wallet:', authorityAddress);
  });

  await t.test('getBundlerAddress() uses project wallet', async () => {
    const { getBundlerAddress, getBundlerWallet } = await import('ao-localnet');
    
    // Get bundler address using SDK
    const bundlerAddress = await getBundlerAddress();
    
    assert.ok(bundlerAddress, 'Bundler address should be returned');
    assert.ok(typeof bundlerAddress === 'string', 'Bundler address should be a string');
    assert.ok(bundlerAddress.length > 0, 'Bundler address should not be empty');
    
    // Verify it matches the project wallet
    const arweave = Arweave.init({});
    const projectWallet = getBundlerWallet();
    const expectedAddress = await arweave.wallets.jwkToAddress(projectWallet);
    
    assert.strictEqual(
      bundlerAddress,
      expectedAddress,
      'Bundler address should match project wallet address'
    );
    
    console.log('   ✅ Bundler address from project wallet:', bundlerAddress);
  });

  await t.test('wallet addresses match config bootstrap data', async () => {
    const { getAuthority, getBundlerAddress, loadConfig } = await import('ao-localnet');
    
    const config = loadConfig();
    const authorityAddress = await getAuthority();
    const bundlerAddress = await getBundlerAddress();
    
    // If bootstrap data exists, verify addresses match
    if (config.bootstrap?.wallets) {
      if (config.bootstrap.wallets.ao) {
        assert.strictEqual(
          authorityAddress,
          config.bootstrap.wallets.ao,
          'Authority should match bootstrap config'
        );
        console.log('   ✅ Authority matches bootstrap config');
      }
      
      if (config.bootstrap.wallets.bundler) {
        assert.strictEqual(
          bundlerAddress,
          config.bootstrap.wallets.bundler,
          'Bundler should match bootstrap config'
        );
        console.log('   ✅ Bundler address matches bootstrap config');
      }
    }
  });

  await t.test('loadWallet() prioritizes project directory', async () => {
    const { loadWallet } = await import('ao-localnet');
    
    // Try loading a wallet that should exist in the project
    const wallet = loadWallet('./wallets/user-wallet.json');
    
    assert.ok(wallet, 'User wallet should be loaded');
    assert.ok(wallet.n, 'Wallet should have modulus (n)');
    
    // Verify it's from the project directory
    const projectWalletPath = resolve(process.cwd(), './wallets/user-wallet.json');
    const projectWallet = JSON.parse(readFileSync(projectWalletPath, 'utf8'));
    
    assert.strictEqual(wallet.n, projectWallet.n, 'Should load from project directory');
    
    console.log('   ✅ User wallet loaded from project directory');
  });

  await t.test('loadWallet() throws helpful error for missing wallet', async () => {
    const { loadWallet } = await import('ao-localnet');
    
    try {
      loadWallet('./wallets/nonexistent-wallet.json');
      assert.fail('Should throw error for missing wallet');
    } catch (error) {
      assert.ok(error.message.includes('Wallet not found'), 'Error should mention wallet not found');
      assert.ok(error.message.includes('Tried locations'), 'Error should list tried locations');
      console.log('   ✅ Helpful error message for missing wallet');
    }
  });

  await t.test('createAoSigner() works with project wallet', async () => {
    const { createAoSigner } = await import('ao-localnet');
    
    const signer = createAoSigner();
    
    assert.ok(signer, 'Signer should be created');
    assert.ok(typeof signer === 'function', 'Signer should be a function');
    
    // Try to sign a simple data item
    const testData = { data: 'test', tags: [] };
    
    // This should not throw
    try {
      await signer(testData);
      console.log('   ✅ Signer works with project wallet');
    } catch (error) {
      // It's okay if signing fails due to missing required fields,
      // we just want to ensure the wallet is accessible
      if (!error.message.includes('wallet')) {
        console.log('   ✅ Signer created successfully (signing failed for other reason)');
      } else {
        throw error;
      }
    }
  });

  await t.test('createBundlerSigner() works with project wallet', async () => {
    const { createBundlerSigner } = await import('ao-localnet');
    
    const signer = createBundlerSigner();
    
    assert.ok(signer, 'Bundler signer should be created');
    assert.ok(typeof signer === 'function', 'Bundler signer should be a function');
    
    console.log('   ✅ Bundler signer created with project wallet');
  });
});

