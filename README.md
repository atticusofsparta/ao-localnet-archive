# AO Localnet Archive

A complete, self-contained AO localnet environment with pre-rate-limit MU, TypeScript SDK, and comprehensive testing suite.

> [!NOTE]
> **This is an archived version of ao-localnet** using pre-rate-limit MU (commit `acb3852`) for optimal testing performance.
>
> Join the Marshal [Discord server](https://discord.gg/KzSRvefPau) for help and support.

## ✨ What's Different

This archive includes:

- **Pre-rate-limit MU** - Uses MU from before rate limiting was added (April 17, 2025)
- **TypeScript SDK** - Pre-configured exports for scheduler, module IDs, and aoconnect
- **Unified package** - All tests and dependencies at root level
- **Bootstrap persistence** - Seed scripts save all IDs to config
- **30 process test** - Load testing with 100% success rate

## 🚀 Quick Start

```shell
# Clone or install
git clone <this-repo>
cd ao-localnet-archive

# Install dependencies
npm install

# Configure and start
npm run configure     # Generate wallets and download AOS module
npm start            # Start Docker containers
npm run seed         # Seed localnet (saves bootstrap info to config)

# Build the SDK
npm run build        # Compile TypeScript SDK

# Run tests
npm test            # Run all tests
```

## 📦 TypeScript SDK

### Installation & Usage

After starting and seeding your localnet, use the SDK in your code:

```typescript
import {
  getAoInstance,
  getScheduler,
  getAosModule,
  getAuthority,
  createAoSigner,
  getBootstrapInfo,
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

### Available SDK Functions

#### Configuration
- `loadConfig()` - Load the localnet configuration
- `getUrls()` - Get all service URLs (gateway, mu, cu, su, bundler)

#### Bootstrap Information
- `getScheduler()` - Get scheduler wallet address
- `getSchedulerLocation()` - Get scheduler location transaction ID
- `getAosModule()` - Get AOS module transaction ID
- `getAuthority()` - Get authority (MU) wallet address
- `getBootstrapInfo()` - Get all bootstrap info at once

#### Wallets & Signers
- `loadWallet(path)` - Load any wallet from file
- `getAoWallet()` - Get the AO wallet (authority wallet)
- `createAoSigner()` - Create a data item signer for the AO wallet

#### AO Connect
- `getAoInstance()` - Get a pre-configured aoconnect instance

#### Docker Management
- `getDockerClient()` - Get Docker client instance
- `isServiceRunning(service)` - Check if a service container is running
- `isServiceHealthy(service)` - Check if a service is healthy
- `isServiceReady(service)` - Check if service is fully ready (healthy + accessible)
- `waitForService(service, timeout)` - Wait for a service to be healthy
- `waitForAllServices(timeout)` - Wait for all services to be healthy
- `waitForServiceReady(service, timeout)` - Wait for service to be fully ready
- `getHealthStatus()` - Get health status of all services
- `getAllServicesStatus()` - Get detailed status of all services
- `getContainerLogs(service, tail)` - Get container logs
- `restartService(service)` - Restart a service
- `stopService(service)` - Stop a service
- `startService(service)` - Start a service
- `getServiceUrl(service)` - Get the URL for a service
- `isServiceAccessible(service)` - Check if service is accessible via HTTP

**Available service names:** `arlocal`, `mu`, `su`, `su-database`, `cu`, `scar`, `bundler`, `lunar`

### Example: E2E Test with Docker Management

```typescript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  getAoInstance,
  getScheduler,
  getAosModule,
  createAoSigner,
  waitForAllServices,
  getHealthStatus,
} from 'ao-localnet';

describe('My AO Tests', () => {
  let ao, processId, signer;

  before(async () => {
    // Wait for all services to be ready before running tests
    console.log('⏳ Waiting for services...');
    const ready = await waitForAllServices(90000);
    
    if (!ready) {
      const health = await getHealthStatus();
      console.error('❌ Services not ready:');
      health.forEach(h => {
        if (!h.healthy) console.error(`   ${h.service}: ${h.status}`);
      });
      throw new Error('Services not ready');
    }
    
    console.log('✅ Services ready!');
    
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

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:spawn      # Spawn process tests
npm run test:module     # Module deployment tests
npm run test:message    # Message sending tests
npm run test:pingpong   # Ping-pong cranking tests
npm run test:config     # Configuration tests
npm run test:ratelimit  # Rate limit tests (includes 30 process spawning)

# Watch mode
npm run test:watch
```

### Test Suites

1. **Config Tests** - Configuration validation and Docker Compose generation
2. **Module Tests** - WASM module deployment and verification
3. **Spawn Tests** - Process spawning with various configurations
4. **Message Tests** - Message sending and result reading
5. **Ping-Pong Tests** - Inter-process communication and cranking
6. **Rate Limit Tests** - Load testing with 100 messages and **30 process spawning**

### Prerequisites for Tests

Before running tests:

```bash
npm start       # Start all services
npm run seed    # Seed network (REQUIRED!)
npm run build   # Build TypeScript SDK
```

## ⚙️ Configuration

Create `.ao-localnet.config.json` for custom settings:

```shell
npm run init          # Create config file
```

### Configuration Options

```json
{
  "version": "1.0",
  "ports": {
    "arlocal": 4000,
    "mu": 4002,
    "su": 4003,
    "cu": 4004,
    "scar": 4006,
    "bundler": 4007,
    "lunar": 4008
  },
  "urls": {
    "gateway": "http://localhost:4000",
    "mu": "http://localhost:4002",
    "cu": "http://localhost:4004"
  },
  "services": {
    "cu": {
      "limits": {
        "maxMemory": "1073741824",
        "maxCompute": "9000000000000"
      }
    }
  },
  "bootstrap": {
    "transactions": {
      "scheduler": "s2yVCqphh0smC01A0feRoL_nMvcIS0bnhW6itEIengc",
      "schedulerLocation": "JPXh3Y1590uvW1MnnfDkTSACB64cnTRxQ9VlFjWyQ-I",
      "aosModule": "csVTAYSiq_OimKjVArqeBdC1ZWBQmJpYHhtlYEKSQJI"
    }
  }
}
```

**Note:** The `bootstrap` section is automatically populated when you run `npm run seed`.

## 📋 Available Commands

### Setup & Management
```bash
npm run configure    # Generate wallets and download AOS module
npm start           # Start all Docker containers
npm stop            # Stop containers (preserves data)
npm run seed        # Seed network and save bootstrap info
npm run reseed      # Reset and re-seed
npm run reset       # Delete all data
```

### Development
```bash
npm run build       # Build TypeScript SDK
npm run build:watch # Build SDK in watch mode
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
```

### CLI Tools
```bash
npx ao-localnet spawn "myprocess"  # Spawn an AOS process
npx ao-localnet aos "myprocess"    # Connect to the process
```

## 🐳 Docker Containers

This localnet runs these services:

- **ArLocal** (port 4000) - Local Arweave gateway
- **MU** (port 4002) - Messenger Unit (pre-rate-limit version)
- **SU** (port 4003) - Scheduler Unit
- **CU** (port 4004) - Compute Unit
- **SCAR** (port 4006) - Smart Contract Archive Reader
- **Bundler** (port 4007) - Transaction bundler
- **Lunar** (port 4008) - Web UI

### Container Naming

All containers use the `ao-localnet-archive-` prefix to avoid conflicts with other localnet instances:

```
ao-localnet-archive-arlocal-1
ao-localnet-archive-mu-1
ao-localnet-archive-su-1
ao-localnet-archive-cu-1
...
```

## 📁 Project Structure

```
ao-localnet-archive/
├── src/
│   └── index.ts              # TypeScript SDK
├── dist/                     # Compiled SDK output
│   ├── index.js
│   ├── index.d.ts
│   └── ...
├── tests/
│   ├── config.test.ts        # Configuration tests
│   ├── module.test.ts        # Module tests
│   ├── spawn.test.ts         # Spawn tests
│   ├── message.test.ts       # Message tests
│   ├── pingpong.test.ts      # Ping-pong tests
│   ├── ratelimit.test.ts     # Rate limit tests (30 processes!)
│   ├── setup.ts              # Test setup utilities
│   └── utils/
│       ├── config.ts         # SDK re-exports
│       └── deployModule.ts   # Module deployment
├── services/
│   ├── arlocal/
│   ├── mu/                   # Pre-rate-limit MU (commit acb3852)
│   ├── su/
│   ├── cu/
│   ├── bundler/
│   └── scar/
├── seed/
│   ├── publish-scheduler-location.mjs  # Saves to config
│   ├── publish-aos-module.mjs          # Saves to config
│   └── seed-for-aos.sh
├── wallets/
│   ├── ao-wallet.json
│   ├── scheduler-location-publisher-wallet.json
│   └── ...
├── examples/
│   └── basic-usage.mjs       # SDK example
├── docker-compose.yml
├── docker-compose.override.yml
├── .ao-localnet.config.json
├── package.json              # Root package with all dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
```

## 🔧 Key Features

### Pre-Rate-Limit MU
Uses MU from commit `acb3852` (April 17, 2025, 14:07) - right before rate limits were added. This provides:
- No rate limiting interference during testing
- Consistent performance
- 100% success rate on high-load tests

### Bootstrap Persistence
When you run `npm run seed`, the following are automatically saved to config:
- Scheduler wallet address
- Scheduler location transaction ID
- AOS module ID
- Module publisher address

This eliminates "magic strings" and makes your tests deterministic.

### TypeScript SDK
Pre-configured exports eliminate boilerplate:
- No manual wallet loading
- No manual URL configuration
- Type-safe access to all bootstrap info
- Pre-configured aoconnect instances

### Comprehensive Testing
- 39 passing tests covering all aspects
- 30 process spawning test (100% success rate)
- Pre-configured test utilities
- All tests use the SDK

## 🚨 Troubleshooting

### Tests Fail with "Scheduler not found"
```bash
npm run seed    # Must seed first!
npm run build   # Rebuild SDK
npm test        # Try again
```

### Port Already in Use
```bash
docker ps       # Check for conflicting containers
npm stop        # Stop any running ao-localnet
```

### Module Not Found
```bash
npm run configure  # Download AOS module
```

### Gateway Connection Errors
```bash
docker compose ps  # Check all services are healthy
docker compose logs arlocal  # Check logs
```

## 📚 Additional Documentation

- `SDK.md` - Detailed SDK documentation
- `CONFIG.md` - Configuration guide
- `CONFIGURATION_SUMMARY.md` - Configuration examples

## 🤝 Contributing

This is an archived version for testing stability. For the latest ao-localnet:
- Visit: https://github.com/MichaelBuhler/ao-localnet

## 📄 License

Same as the original ao-localnet project.

## 🙏 Credits

- Original ao-localnet by [@MichaelBuhler](https://github.com/MichaelBuhler)
- Archive modifications for pre-rate-limit testing
- TypeScript SDK and unified package structure

---

**Happy Testing! 🚀**
