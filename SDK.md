# AO Localnet SDK

A TypeScript SDK for seamless integration with the AO localnet environment.

## 🎯 What We Built

### 1. **Enhanced Seeding Scripts**
The seed scripts now persist all bootstrap information to the config file:

- **Scheduler address** (wallet that published the scheduler location)
- **Scheduler location transaction ID**
- **AOS module ID**
- **AOS module publisher address**

### 2. **TypeScript SDK** (`src/index.ts`)
A comprehensive SDK that exports:

#### Configuration
- `loadConfig()` - Load the localnet configuration
- `clearConfigCache()` - Clear cached config
- `getUrls()` - Get all service URLs

#### Bootstrap Information
- `getScheduler()` - Scheduler wallet address
- `getSchedulerLocation()` - Scheduler location TX ID
- `getAosModule()` - AOS module TX ID
- `getAuthority()` - Authority (MU) wallet address

#### Wallets & Signers
- `loadWallet(path)` - Load any wallet
- `getAoWallet()` - Get the AO wallet
- `createAoSigner()` - Create signer for AO wallet

#### AO Connect
- `getAoInstance()` - Pre-configured aoconnect instance

#### All-in-One
- `getBootstrapInfo()` - Get all bootstrap info at once

#### Docker Management
- `getDockerClient()` - Get Docker client instance
- `isServiceRunning(service)` - Check if service is running
- `isServiceHealthy(service)` - Check if service is healthy
- `isServiceReady(service)` - Check if service is fully ready (healthy + accessible)
- `waitForService(service, timeout)` - Wait for service to be healthy
- `waitForAllServices(timeout)` - Wait for all services to be healthy
- `waitForServiceReady(service, timeout)` - Wait for service to be fully ready
- `getHealthStatus()` - Get health status of all services
- `getAllServicesStatus()` - Get detailed status of all services
- `getContainerLogs(service, tail)` - Get container logs
- `restartService(service)` - Restart a service
- `stopService(service)` - Stop a service
- `startService(service)` - Start a service
- `getServiceUrl(service)` - Get service URL
- `isServiceAccessible(service)` - Check if service is accessible via HTTP

## 🚀 Quick Start

### 1. Start & Seed the Localnet

```bash
pnpm start    # Start all services
pnpm run seed # Seed with scheduler and module
```

### 2. Build the SDK

```bash
pnpm run build
```

### 3. Use in Your Code

```typescript
import {
  getAoInstance,
  getScheduler,
  getAosModule,
  createAoSigner,
} from 'ao-localnet';

// Get pre-configured instances
const ao = getAoInstance();
const signer = createAoSigner();
const moduleId = getAosModule();
const scheduler = getScheduler();

// Spawn a process
const processId = await ao.spawn({
  module: moduleId,
  scheduler: scheduler,
  signer: signer,
  tags: [{ name: 'Name', value: 'My Process' }],
});

// Send a message
const messageId = await ao.message({
  process: processId,
  signer: signer,
  tags: [{ name: 'Action', value: 'Eval' }],
  data: 'return "Hello, AO!"',
});
```

## 📦 What Gets Stored in Config

After running `pnpm run seed`, your `.ao-localnet.config.json` will have:

```json
{
  "bootstrap": {
    "transactions": {
      "scheduler": "s2yVCqphh0smC01A0feRoL_nMvcIS0bnhW6itEIengc",
      "schedulerLocation": "JPXh3Y1590uvW1MnnfDkTSACB64cnTRxQ9VlFjWyQ-I",
      "aosModule": "csVTAYSiq_OimKjVArqeBdC1ZWBQmJpYHhtlYEKSQJI",
      "aosModulePublisher": "_xRBR7Y32SO7v8fHImuh3CpvRcYEvBLPvcLGerBO2t4"
    },
    "lastBootstrap": "2025-11-20T15:24:00.000Z"
  }
}
```

## 🔧 Key Features

### No More Magic Strings
Instead of hardcoding or manually copying IDs:
```typescript
// ❌ Before
const moduleId = 'Zt97mT5LKMLUzUC6ooBmb0LYR3SVgk-JScoZglyc3S0';
const scheduler = 's2yVCqphh0smC01A0feRoL_nMvcIS0bnhW6itEIengc';

// ✅ After
const moduleId = getAosModule();
const scheduler = getScheduler();
```

### Type Safety
Full TypeScript support with autocomplete and type checking:
```typescript
const info = await getBootstrapInfo();
// info.scheduler ✅ TypeScript knows the shape
// info.aosModule ✅ All properties typed
```

### Pre-configured AO Connect
No need to manually configure aoconnect:
```typescript
// ❌ Before
const ao = connect({
  MU_URL: 'http://localhost:4002',
  CU_URL: 'http://localhost:4004',
  GATEWAY_URL: 'http://localhost:4000',
});

// ✅ After
const ao = getAoInstance();
```

### Automatic Signer Creation
```typescript
// ❌ Before
const wallet = JSON.parse(readFileSync('./wallets/ao-wallet.json', 'utf8'));
const signer = createDataItemSigner(wallet);

// ✅ After
const signer = createAoSigner();
```

## 🐳 Docker Management

The SDK includes comprehensive Docker management functions for programmatic control of the localnet containers.

### Check Service Status

```typescript
import { isServiceHealthy, getHealthStatus } from 'ao-localnet';

// Check if MU is healthy
const muHealthy = await isServiceHealthy('mu');

// Get status of all services
const health = await getHealthStatus();
health.forEach(h => {
  console.log(`${h.service}: ${h.healthy ? '✅' : '❌'} (${h.status})`);
});
```

### Wait for Services

```typescript
import { waitForService, waitForAllServices } from 'ao-localnet';

// Wait for MU to be ready (60 second timeout)
await waitForService('mu', 60000);

// Wait for all services to be ready (90 second timeout)
await waitForAllServices(90000);
```

### Service Management

```typescript
import { restartService, waitForServiceReady, getContainerLogs } from 'ao-localnet';

// Restart MU service
await restartService('mu');
await waitForServiceReady('mu');

// Get recent logs
const logs = await getContainerLogs('mu', 50);
console.log(logs);
```

### E2E Test Setup with Docker

```typescript
import { before } from 'node:test';
import { waitForAllServices, getHealthStatus } from 'ao-localnet';

before(async () => {
  console.log('⏳ Waiting for services...');
  
  const ready = await waitForAllServices(90000);
  
  if (!ready) {
    const health = await getHealthStatus();
    console.error('Services not ready:');
    health.forEach(h => {
      if (!h.healthy) {
        console.error(`  ❌ ${h.service}: ${h.status}`);
      }
    });
    throw new Error('Services not ready');
  }
  
  console.log('✅ All services ready!');
});
```

### Available Services

The following service names can be used with Docker management functions:

- `arlocal` - Local Arweave gateway
- `mu` - Messenger Unit
- `su` - Scheduler Unit
- `su-database` - Scheduler Unit database
- `cu` - Compute Unit
- `scar` - SCAR service
- `bundler` - Transaction bundler
- `lunar` - Lunar service

## 🧪 Example: E2E Test

```typescript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  getAoInstance,
  getScheduler,
  getAosModule,
  createAoSigner,
  waitForAllServices,
} from 'ao-localnet';

describe('My AO Tests', () => {
  let ao, processId, signer;

  before(async () => {
    // Wait for all services to be ready
    await waitForAllServices(90000);
    
    ao = getAoInstance();
    signer = createAoSigner();
    
    processId = await ao.spawn({
      module: getAosModule(),
      scheduler: getScheduler(),
      signer: signer,
      tags: [{ name: 'Name', value: 'Test' }],
    });
  });

  it('should send message', async () => {
    const messageId = await ao.message({
      process: processId,
      signer: signer,
      tags: [{ name: 'Action', value: 'Eval' }],
      data: 'return 2 + 2',
    });
    
    assert.ok(messageId);
  });
});
```

## 📋 Files Created

```
ao-localnet-archive/
├── src/
│   ├── index.ts          # Main SDK module
│   └── docker.ts         # Docker management module
├── dist/                 # Compiled output
│   ├── index.js
│   ├── index.d.ts
│   ├── docker.js
│   ├── docker.d.ts
│   └── *.js.map files
├── examples/
│   ├── basic-usage.mjs           # Basic SDK usage
│   ├── docker-management.mjs     # Docker management example
│   └── e2e-with-docker.test.mjs  # E2E test with Docker
├── tsconfig.json         # TypeScript config
└── SDK.md               # This file
```

## 🔄 Updated Files

### Seed Scripts
- `seed/publish-scheduler-location.mjs` - Now saves scheduler to config
- `seed/publish-aos-module.mjs` - Now saves module ID to config

### Package Configuration
- `package.json` - Added exports, types, build scripts
- `.gitignore` - Added `dist/` folder

## 🎓 Benefits for E2E Testing

1. **Deterministic** - All IDs stored in config after seeding
2. **No Manual Setup** - Just import and use
3. **Type Safe** - Catch errors at compile time
4. **Testable** - Easy to mock/stub for testing
5. **Consistent** - Same configuration everywhere

## 🚨 Important Notes

### Always Seed First
The SDK requires a seeded localnet:
```bash
pnpm start
pnpm run seed  # ← Must run this!
pnpm run build # ← Then build SDK
```

### Errors if Not Seeded
The SDK will throw clear errors if bootstrap info is missing:
```
Error: Scheduler not found in config. Please run: pnpm run seed
```

### Reseed After Reset
If you reset the network:
```bash
pnpm run reseed  # Reset + seed in one command
pnpm run build   # Rebuild SDK
```

## 🎯 Summary

You now have a professional SDK that:
- ✅ Stores all bootstrap info automatically during seeding
- ✅ Provides type-safe access to scheduler, module IDs, and wallets
- ✅ Pre-configures aoconnect instances
- ✅ **Programmatic Docker container management**
- ✅ **Service health checking and readiness waiting**
- ✅ Makes E2E testing simple and consistent
- ✅ Eliminates magic strings and manual configuration

Perfect for integration into your e2e testing framework! 🚀

