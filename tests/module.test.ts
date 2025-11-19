import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import Arweave from 'arweave';
import { setupTests, getModuleId } from './setup.js';
import { getLocalnetUrls } from './utils/config.js';
import { checkModuleExists } from './utils/deployModule.js';

describe('AO Localnet - Module Tests', () => {
  let moduleId: string;
  let arweave: Arweave;

  before(async () => {
    // Deploy module and setup
    moduleId = await setupTests();
    
    // Setup Arweave client
    const urls = getLocalnetUrls();
    const gatewayUrl = new URL(urls.gateway);
    arweave = Arweave.init({
      host: gatewayUrl.hostname,
      port: parseInt(gatewayUrl.port) || 80,
      protocol: gatewayUrl.protocol.replace(':', ''),
    });
  });

  it('should verify module was deployed', async () => {
    console.log(`🔍 Checking module: ${moduleId}`);

    const exists = await checkModuleExists(moduleId);
    console.log(`✅ Module exists: ${exists}`);

    assert.strictEqual(exists, true);
  });

  it('should have correct module tags', async () => {
    console.log('🏷️  Checking module tags...');

    const tx = await arweave.transactions.get(moduleId);
    const tags: { name: string; value: string }[] = [];
    
    tx.tags.forEach((tag) => {
      const name = tag.get('name', { decode: true, string: true });
      const value = tag.get('value', { decode: true, string: true });
      tags.push({ name, value });
    });

    console.log('📋 Module tags:', tags);

    // Verify required tags
    const dataProtocol = tags.find(t => t.name === 'Data-Protocol');
    const type = tags.find(t => t.name === 'Type');
    const contentType = tags.find(t => t.name === 'Content-Type');

    assert.strictEqual(dataProtocol?.value, 'ao');
    assert.strictEqual(type?.value, 'Module');
    assert.strictEqual(contentType?.value, 'application/wasm');
  });

  it('should retrieve module data', async () => {
    console.log('📥 Retrieving module data...');

    const tx = await arweave.transactions.get(moduleId);
    const data = tx.get('data', { decode: true, string: false });

    console.log(`✅ Module size: ${(data.length / 1024 / 1024).toFixed(2)} MB`);

    // Verify it's WASM (starts with magic bytes)
    const magicBytes = data.slice(0, 4);
    const wasmMagic = Buffer.from([0x00, 0x61, 0x73, 0x6d]); // \0asm

    assert.deepStrictEqual(
      Buffer.from(magicBytes),
      wasmMagic,
      'Module should be valid WASM'
    );
  });

  it('should use the deployed module ID consistently', () => {
    const retrievedModuleId = getModuleId();
    
    console.log(`🔗 Module ID: ${retrievedModuleId}`);
    
    assert.strictEqual(retrievedModuleId, moduleId);
    assert.strictEqual(retrievedModuleId.length, 43);
  });
});

