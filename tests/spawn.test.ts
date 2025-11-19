import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import { setupTests } from './setup.js';
import { getLocalnetUrls, getScheduler, getAoWallet } from './utils/config.js';

describe('AO Localnet - Spawn Process Tests', () => {
  let moduleId: string;
  let ao: ReturnType<typeof connect>;
  let signer: any;

  before(async () => {
    // Deploy module and setup
    moduleId = await setupTests();
    
    // Setup aoconnect with localnet URLs
    const urls = getLocalnetUrls();
    ao = connect({
      MU_URL: urls.mu,
      CU_URL: urls.cu,
      GATEWAY_URL: urls.gateway,
    });

    // Create signer from wallet
    const wallet = getAoWallet();
    signer = createDataItemSigner(wallet);
  });

  it('should spawn a new AO process', async () => {
    const scheduler = await getScheduler();
    
    console.log('📝 Spawning process...');
    console.log(`  Module: ${moduleId}`);
    console.log(`  Scheduler: ${scheduler}`);

    const processId = await ao.spawn({
      module: moduleId,
      scheduler: scheduler,
      signer: signer,
      tags: [
        { name: 'Name', value: 'Test Process' },
        { name: 'Description', value: 'A test process for ao-localnet' },
      ],
    });

    console.log(`✅ Process spawned: ${processId}`);

    // Verify process ID is a valid 43-character Arweave ID
    assert.strictEqual(typeof processId, 'string');
    assert.strictEqual(processId.length, 43);
    assert.match(processId, /^[a-zA-Z0-9_-]{43}$/);
  });

  it('should spawn multiple processes independently', async () => {
    const scheduler = await getScheduler();

    console.log('📝 Spawning first process...');
    const processId1 = await ao.spawn({
      module: moduleId,
      scheduler: scheduler,
      signer: signer,
      tags: [{ name: 'Name', value: 'Test Process 1' }],
    });

    console.log('📝 Spawning second process...');
    const processId2 = await ao.spawn({
      module: moduleId,
      scheduler: scheduler,
      signer: signer,
      tags: [{ name: 'Name', value: 'Test Process 2' }],
    });

    console.log(`✅ Process 1: ${processId1}`);
    console.log(`✅ Process 2: ${processId2}`);

    // Verify processes have different IDs
    assert.notStrictEqual(processId1, processId2);
  });

  it('should spawn a process with custom tags', async () => {
    const scheduler = await getScheduler();

    const customTags = [
      { name: 'Name', value: 'Custom Tagged Process' },
      { name: 'App-Name', value: 'MyTestApp' },
      { name: 'App-Version', value: '1.0.0' },
      { name: 'Environment', value: 'test' },
    ];

    console.log('📝 Spawning process with custom tags...');
    const processId = await ao.spawn({
      module: moduleId,
      scheduler: scheduler,
      signer: signer,
      tags: customTags,
    });

    console.log(`✅ Process with tags spawned: ${processId}`);

    // Verify process ID is valid
    assert.ok(processId);
    assert.strictEqual(processId.length, 43);
  });
});

