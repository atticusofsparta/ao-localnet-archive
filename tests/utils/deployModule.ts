import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Arweave from 'arweave';
import { getLocalnetUrls, getAoWallet } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Deploy the AOS WASM module to ArLocal
 */
export async function deployAosModule(): Promise<string> {
  const urls = getLocalnetUrls();
  const wallet = getAoWallet();

  // Parse gateway URL
  const gatewayUrl = new URL(urls.gateway);
  const arweave = Arweave.init({
    host: gatewayUrl.hostname,
    port: parseInt(gatewayUrl.port) || 80,
    protocol: gatewayUrl.protocol.replace(':', ''),
  });

  // Load WASM module
  const modulePath = resolve(__dirname, '../fixtures/aos-cbn0KKrBZH7hdNkNokuXLtGryrWM--PjSTBqIzw9Kkk.wasm');
  const wasmBinary = readFileSync(modulePath);

  console.log(`📦 Deploying AOS module (${(wasmBinary.length / 1024 / 1024).toFixed(2)} MB)...`);

  // Create transaction
  const tx = await arweave.createTransaction({
    data: wasmBinary,
  }, wallet);

  // Add tags
  tx.addTag('Data-Protocol', 'ao');
  tx.addTag('Variant', 'ao.TN.1');
  tx.addTag('Type', 'Module');
  tx.addTag('Module-Format', 'wasm32-unknown-emscripten');
  tx.addTag('Input-Encoding', 'JSON-1');
  tx.addTag('Output-Encoding', 'JSON-1');
  tx.addTag('Memory-Limit', '1-gb');
  tx.addTag('Compute-Limit', '9000000000000');
  tx.addTag('Content-Type', 'application/wasm');

  // Sign and post
  await arweave.transactions.sign(tx, wallet);
  
  const moduleId = tx.id;
  console.log(`📤 Posting transaction: ${moduleId}`);
  
  const response = await arweave.transactions.post(tx);
  console.log(`📡 Post response:`, response.status, response.statusText);

  if (response.status !== 200) {
    throw new Error(`Failed to post transaction: ${response.status} ${response.statusText}`);
  }

  console.log(`✅ Module deployed: ${moduleId}`);

  // Wait for ArLocal to process (it's async)
  console.log(`⏳ Waiting for confirmation...`);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify it's actually there
  try {
    await arweave.transactions.get(moduleId);
    console.log(`✅ Module confirmed on ArLocal`);
  } catch (error) {
    console.warn(`⚠️  Module not immediately available:`, error.message);
    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return moduleId;
}

/**
 * Check if a module exists on ArLocal (with retries)
 */
export async function checkModuleExists(moduleId: string, maxRetries = 5): Promise<boolean> {
  const urls = getLocalnetUrls();
  const gatewayUrl = new URL(urls.gateway);
  
  const arweave = Arweave.init({
    host: gatewayUrl.hostname,
    port: parseInt(gatewayUrl.port) || 80,
    protocol: gatewayUrl.protocol.replace(':', ''),
  });

  for (let i = 0; i < maxRetries; i++) {
    try {
      const tx = await arweave.transactions.get(moduleId);
      return !!tx;
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(`  Retry ${i + 1}/${maxRetries - 1}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  return false;
}

