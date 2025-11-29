import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import { readFileSync } from 'fs';

const wallet = JSON.parse(readFileSync('../wallets/ao-wallet.json', 'utf8'));
const signer = createDataItemSigner(wallet);

const ao = connect({
  MU_URL: 'http://localhost:4002',
  CU_URL: 'http://localhost:4004',
  GATEWAY_URL: 'http://localhost:4000',
});

const config = JSON.parse(readFileSync('../.ao-localnet.config.json', 'utf8'));

console.log('Module:', config.aosModule);
console.log('Scheduler:', config.scheduler);

try {
  const processId = await ao.spawn({
    module: config.aosModule,
    scheduler: config.scheduler,
    signer: signer,
    tags: [
      { name: 'Name', value: 'Manual Test Process' },
    ],
  });
  console.log('✅ Process spawned:', processId);
} catch (error) {
  console.error('❌ Error:', error);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  if (error.cause) {
    console.error('Error cause:', error.cause);
  }
}
