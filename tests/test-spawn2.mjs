import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import { getScheduler, getAosModule, getAoWallet, getUrls } from '../dist/index.js';

const wallet = getAoWallet();
const signer = createDataItemSigner(wallet);
const urls = getUrls();

const ao = connect({
  MU_URL: urls.mu,
  CU_URL: urls.cu,
  GATEWAY_URL: urls.gateway,
});

const scheduler = getScheduler();
const moduleId = getAosModule();

console.log('Module:', moduleId);
console.log('Scheduler:', scheduler);
console.log('URLs:', urls);

try {
  console.log('\n📝 Attempting to spawn process...');
  const processId = await ao.spawn({
    module: moduleId,
    scheduler: scheduler,
    signer: signer,
    tags: [
      { name: 'Name', value: 'Manual Test Process' },
    ],
  });
  console.log('✅ Process spawned:', processId);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
  if (error.cause) {
    console.error('Cause:', error.cause);
  }
}
