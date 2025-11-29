#!/usr/bin/env node
/**
 * E2E Test 1: Basic SDK Usage
 * 
 * Tests that the ao-localnet package can be imported and used
 * as a dependency in a consumer project.
 */

import { test } from 'node:test';
import assert from 'node:assert';

test('E2E: Basic SDK Usage', async (t) => {
  await t.test('can import package', async () => {
    const pkg = await import('ao-localnet');
    assert.ok(pkg, 'Package should be importable');
  });

  await t.test('can import SDK functions', async () => {
    const {
      getAoInstance,
      getScheduler,
      getAosModule,
      getUrls,
      createAoSigner,
      loadConfig,
    } = await import('ao-localnet');
    
    assert.ok(typeof getAoInstance === 'function', 'getAoInstance should be a function');
    assert.ok(typeof getScheduler === 'function', 'getScheduler should be a function');
    assert.ok(typeof getAosModule === 'function', 'getAosModule should be a function');
    assert.ok(typeof getUrls === 'function', 'getUrls should be a function');
    assert.ok(typeof createAoSigner === 'function', 'createAoSigner should be a function');
    assert.ok(typeof loadConfig === 'function', 'loadConfig should be a function');
  });

  await t.test('can import LocalnetClient', async () => {
    const { LocalnetClient } = await import('ao-localnet/client');
    assert.ok(LocalnetClient, 'LocalnetClient should be importable');
    assert.ok(typeof LocalnetClient === 'function', 'LocalnetClient should be a constructor');
  });

  await t.test('can get URLs', async () => {
    const { getUrls } = await import('ao-localnet');
    const urls = getUrls();
    
    assert.ok(urls.gateway, 'Should have gateway URL');
    assert.ok(urls.mu, 'Should have MU URL');
    assert.ok(urls.cu, 'Should have CU URL');
    assert.ok(urls.su, 'Should have SU URL');
    
    console.log('   URLs:', urls);
  });

  await t.test('can load config', async () => {
    const { loadConfig } = await import('ao-localnet');
    const config = loadConfig();
    
    assert.ok(config, 'Config should load');
    assert.ok(config.services, 'Config should have services');
    assert.ok(config.wallets, 'Config should have wallets');
    
    console.log('   Config version:', config.version);
  });

  await t.test('can get AO instance', async () => {
    const { getAoInstance } = await import('ao-localnet');
    const ao = getAoInstance();
    
    assert.ok(ao, 'AO instance should be created');
    assert.ok(typeof ao.spawn === 'function', 'AO instance should have spawn method');
    assert.ok(typeof ao.message === 'function', 'AO instance should have message method');
    assert.ok(typeof ao.result === 'function', 'AO instance should have result method');
  });

  await t.test('can create signer', async () => {
    const { createAoSigner } = await import('ao-localnet');
    const signer = createAoSigner();
    
    assert.ok(signer, 'Signer should be created');
    assert.ok(typeof signer === 'function', 'Signer should be a function');
  });

  await t.test('can get scheduler and module IDs', async () => {
    const { getScheduler, getAosModule } = await import('ao-localnet');
    
    // These should not throw (they're seeded)
    const scheduler = getScheduler();
    const module = getAosModule();
    
    assert.ok(scheduler, 'Scheduler should be defined');
    assert.ok(module, 'AOS module should be defined');
    assert.ok(typeof scheduler === 'string', 'Scheduler should be a string');
    assert.ok(typeof module === 'string', 'Module should be a string');
    
    console.log('   Scheduler:', scheduler);
    console.log('   AOS Module:', module);
  });
});

