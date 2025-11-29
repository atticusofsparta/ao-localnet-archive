# AO Localnet Archive

A complete, self-contained AO localnet environment with pre-rate-limit MU, TypeScript SDK, and comprehensive testing suite.

> [!NOTE]
> **This is an archived version of ao-localnet** using MU commit `fa48943` (September 9, 2025) with comprehensive rate limit patches for optimal testing performance.
>
> Join the Marshal [Discord server](https://discord.gg/KzSRvefPau) for help and support.

## ✨ What's Different

This archive includes:

- **MU with Hyperbeam + No Rate Limits** - Uses MU `fa48943` with comprehensive rate limit patches
- **TypeScript SDK** - Pre-configured exports for scheduler, module IDs, and aoconnect
- **Unified package** - All tests and dependencies at root level
- **Bootstrap persistence** - Seed scripts save all IDs to config
- **Auto-seeding** - Automatically detects and re-seeds missing scheduler location/module
- **Auto-mining proxy** - Transactions are automatically mined without manual intervention
- **30 process test** - Load testing with 100% success rate

## 🚀 Quick Start

```shell
# Clone or install
git clone <this-repo>
cd ao-localnet-archive

# Install dependencies
pnpm install

# Configure and start
pnpm run configure     # Generate wallets and download AOS module
pnpm start            # Start Docker containers
pnpm run seed         # Seed localnet (saves bootstrap info to config)

# Build the SDK
pnpm run build        # Compile TypeScript SDK

# Run tests
pnpm test            # Run all tests
```

### 🔗 Using with pnpm link (Development)

This package is globally linked for local development! You can use it in other projects:

```bash
# In your other project
cd /path/to/your/project
pnpm link ao-localnet

# Now import from 'ao-localnet' in your code
import { getAoInstance, waitForAllServices } from 'ao-localnet';
```

**Changes to `ao-localnet-archive` are immediately available** in linked projects after rebuilding:

```bash
cd /Volumes/primary_all/ao-localnet-archive
pnpm run build        # Rebuild and changes are live!
```

See [PNPM_LINK_GUIDE.md](./PNPM_LINK_GUIDE.md) for detailed instructions.

## 🌱 Auto-Seeding

The localnet now includes **automatic seeding** that detects and repairs missing bootstrap data:

```typescript
import { LocalnetClient } from 'ao-localnet';

const client = new LocalnetClient();

// Auto-seeding happens automatically on start
await client.start({
  waitForHealthy: true,
  autoSeed: true,  // default: true
  onProgress: (msg) => console.log(msg),
});
```

**What it does:**
- Checks if scheduler location transaction exists in arlocal
- Checks if AOS module transaction exists in arlocal  
- Automatically re-seeds if either is missing
- No more "scheduler location not found" errors!

**When it helps:**
- Fresh starts with no seed data
- Non-persistent restarts (data cleared)
- Manual config edits or corruption
- Service restarts across different sessions

See [AUTO_SEED_IMPLEMENTATION.md](./AUTO_SEED_IMPLEMENTATION.md) for full details.

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
- `verifySchedulerLocation(forceReload?)` - Check if scheduler location exists in arlocal
- `verifyAosModule(forceReload?)` - Check if AOS module exists in arlocal
- `ensureSeeded(options?)` - Automatically seed if data is missing

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
pnpm test

# Run specific test suites
pnpm run test:spawn      # Spawn process tests
pnpm run test:module     # Module deployment tests
pnpm run test:message    # Message sending tests
pnpm run test:pingpong   # Ping-pong cranking tests
pnpm run test:config     # Configuration tests
pnpm run test:ratelimit      # Rate limit tests (includes 30 process spawning)
pnpm run test:rate-limit-fix # Verify rate limits are completely disabled

# E2E tests (test as a dependency in consumer project)
pnpm run test:e2e            # Full E2E test suite
pnpm run test:e2e:setup      # Setup E2E test environment
pnpm run test:proxy      # Arlocal-proxy auto-mining tests (14 tests)
pnpm run test:client     # Docker client integration tests (15 tests, spawns 100 processes)

# Watch mode
pnpm run test:watch
```

### Test Suites

1. **Config Tests** - Configuration validation and Docker Compose generation
2. **Module Tests** - WASM module deployment and verification
3. **Spawn Tests** - Process spawning with various configurations
4. **Message Tests** - Message sending and result reading
5. **Ping-Pong Tests** - Inter-process communication and cranking
6. **Rate Limit Tests** - Load testing with 100 messages and **30 process spawning**
7. **Proxy Tests** - Arlocal-proxy auto-mining verification (14 comprehensive tests)
8. **Client Tests** - Docker client integration testing (15 tests):
   - Service lifecycle (start/stop/restart)
   - Data persistence
   - Service logging and monitoring
   - **High-load: spawns 100 processes in 1.6 seconds!**
   - Message passing between processes
   - Performance metrics
9. **E2E Tests** - End-to-end testing as a dependency (24 tests):
   - Package installation and imports
   - SDK functionality in consumer projects
   - LocalnetClient service management
   - Auto-seeding verification
   - Rate limit testing (25 rapid messages, 5 parallel spawns)
   - Simulates real implementation environment

See [e2e-test/README.md](./e2e-test/README.md) for detailed E2E test documentation.

### Prerequisites for Tests

Before running tests:

```bash
pnpm start       # Start all services
pnpm run seed    # Seed network (REQUIRED!)
pnpm run build   # Build TypeScript SDK
```

## ⚙️ Configuration

Create `.ao-localnet.config.json` for custom settings:

```shell
pnpm run init          # Create config file
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

**Note:** The `bootstrap` section is automatically populated when you run `pnpm run seed`.

## 📋 Available Commands

### Setup & Management
```bash
pnpm run configure    # Generate wallets and download AOS module
pnpm start           # Start all Docker containers
pnpm stop            # Stop containers (preserves data)
pnpm run seed        # Seed network and save bootstrap info
pnpm run reseed      # Reset and re-seed
pnpm run reset       # Delete all data
```

### Development
```bash
pnpm run build       # Build TypeScript SDK
pnpm run build:watch # Build SDK in watch mode
pnpm test           # Run all tests
pnpm run test:watch # Run tests in watch mode
```

### CLI Tools
```bash
npx ao-localnet spawn "myprocess"  # Spawn an AOS process
npx ao-localnet aos "myprocess"    # Connect to the process
```

## 🐳 Docker Containers

This localnet runs these services:

- **ArLocal Proxy** (port 4000) - Transparent proxy with auto-mining ⚡
- **ArLocal** (internal only) - Local Arweave gateway
- **MU** (port 4002) - Messenger Unit (pre-rate-limit version)
- **SU** (port 4003) - Scheduler Unit
- **CU** (port 4004) - Compute Unit
- **SCAR** (port 4006) - Smart Contract Archive Reader
- **Bundler** (port 4007) - Transaction bundler
- **Lunar** (port 4008) - Web UI

### ⚡ Auto-Mining Proxy

The **arlocal-proxy** automatically mines blocks after transactions are posted, eliminating manual mining during development:

- ✅ Transparent - forwards all requests to arlocal
- ✅ Smart - detects transaction submissions (POST/PUT)
- ✅ Automatic - mines after successful transactions
- ✅ Non-blocking - mining happens in background
- ✅ Race-safe - queues concurrent mine requests

See [ARLOCAL_PROXY.md](./ARLOCAL_PROXY.md) for detailed documentation.

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

### MU with Comprehensive Rate Limit Patches
Uses MU from commit `fa48943` (September 9, 2025) with comprehensive patches that:
- Remove all rate limit configuration and middleware
- Stub out rate limit validation functions
- Set unlimited rate limit environment variables
- Support hyperbeam device message handlers
- Provide optimal testing performance with zero rate limiting interference
- Consistent performance
- 100% success rate on high-load tests

### Bootstrap Persistence
When you run `pnpm run seed`, the following are automatically saved to config:
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
pnpm run seed    # Must seed first!
pnpm run build   # Rebuild SDK
pnpm test        # Try again
```

### Port Already in Use
```bash
docker ps       # Check for conflicting containers
pnpm stop        # Stop any running ao-localnet
```

### Module Not Found
```bash
pnpm run configure  # Download AOS module
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
