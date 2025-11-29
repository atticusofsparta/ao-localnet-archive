import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import { getScheduler, getAosModule, getAoWallet, getUrls } from '../dist/index.js';
import http from 'http';

// Intercept HTTP requests to see what's being sent
const originalRequest = http.request;
http.request = function(...args) {
  const req = originalRequest.apply(this, args);
  const originalWrite = req.write.bind(req);
  const originalEnd = req.end.bind(req);
  
  req.write = function(chunk, ...rest) {
    console.log('\n📤 HTTP Request:');
    console.log('  Headers:', req.getHeaders());
    console.log('  Body type:', typeof chunk);
    console.log('  Body length:', chunk?.length);
    console.log('  Is Buffer:', Buffer.isBuffer(chunk));
    return originalWrite(chunk, ...rest);
  };
  
  req.end = function(chunk, ...rest) {
    if (chunk) {
      console.log('\n📤 HTTP Request (end):');
      console.log('  Headers:', req.getHeaders());
      console.log('  Body type:', typeof chunk);
      console.log('  Body length:', chunk?.length);
      console.log('  Is Buffer:', Buffer.isBuffer(chunk));
    }
    return originalEnd(chunk, ...rest);
  };
  
  return req;
};

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

try {
  console.log('\n📝 Attempting to spawn process...');
  const processId = await ao.spawn({
    module: moduleId,
    scheduler: scheduler,
    signer: signer,
    tags: [
      { name: 'Name', value: 'Debug Test Process' },
    ],
  });
  console.log('✅ Process spawned:', processId);
} catch (error) {
  console.error('\n❌ Error:', error.message);
}
