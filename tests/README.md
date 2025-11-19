# AO Localnet Tests

Comprehensive test suite for ao-localnet using Node's native test framework, TypeScript, and aoconnect.

## Setup

```bash
cd tests
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:spawn      # Spawn process tests
npm run test:module     # Module deployment tests
npm run test:message    # Message sending tests
npm run test:pingpong   # Ping-pong cranking tests
npm run test:config     # Configuration tests
npm run test:ratelimit  # Rate limit tests

# Watch mode
npm run test:watch
```

## Prerequisites

Before running tests, make sure ao-localnet is running and seeded:

```bash
# In the root directory
npx ao-localnet configure   # Generate wallets
npx ao-localnet start       # Start services
npx ao-localnet seed        # Seed data (REQUIRED for spawn tests!)
```

The tests will automatically:
1. ✅ Mint AR tokens for your wallet
2. ✅ Deploy the AOS WASM module from `fixtures/`
3. ✅ Use your configured localnet URLs
4. ✅ Use your AO wallet for signing

**Note:** The spawn and message tests require `npx ao-localnet seed` to be run first to publish the scheduler location.

## Test Suites

### 1. Module Tests (`module.test.ts`)

Tests for WASM module deployment and verification:
- ✅ Verify module was deployed to ArLocal
- ✅ Check module has correct tags
- ✅ Retrieve and validate module data
- ✅ Verify WASM magic bytes

### 2. Spawn Tests (`spawn.test.ts`)

Tests for spawning AO processes:
- ✅ Spawn a new process
- ✅ Spawn multiple independent processes
- ✅ Spawn with custom tags
- ✅ Verify process IDs

### 3. Message Tests (`message.test.ts`)

Tests for sending messages and evaluating code:
- ✅ Send messages to processes
- ✅ Send Lua code for evaluation
- ✅ Read results from processes
- ✅ Handle multiple messages

### 4. Ping-Pong Tests (`pingpong.test.ts`)

Tests for inter-process message passing and cranking:
- ✅ Spawn multiple processes
- ✅ Load Lua handlers into processes
- ✅ Initiate ping from one process to another
- ✅ Crank messages and verify results
- ✅ Test complete message flow

📖 **See [PINGPONG_TEST.md](./PINGPONG_TEST.md) for detailed ping-pong testing documentation.**

### 5. Config Tests (`config.test.ts`)

Tests for configuration validation and application:
- ✅ Configuration structure and format
- ✅ Port configuration and uniqueness
- ✅ Wallet files and validation
- ✅ Data folder bindings
- ✅ Service configuration (rate limits, formats)
- ✅ Transaction hydration
- ✅ URL validation
- ✅ Docker Compose override generation

📖 **See [CONFIG_TEST.md](./CONFIG_TEST.md) for detailed configuration testing documentation.**
📖 **See [HYDRATION.md](./HYDRATION.md) for transaction hydration guide.**

## Project Structure

```
tests/
├── package.json           # Test dependencies
├── tsconfig.json         # TypeScript config
├── setup.ts              # Test setup (deploys module)
├── module.test.ts        # Module deployment tests
├── spawn.test.ts         # Process spawning tests
├── message.test.ts       # Message sending tests
├── utils/
│   ├── config.ts         # Load localnet config
│   └── deployModule.ts   # Deploy WASM module
└── fixtures/
    └── aos-cbn0...wasm   # AOS WASM module
```

## Configuration

Tests automatically read from `../.ao-localnet.config.json`:

```json
{
  "urls": {
    "gateway": "http://localhost:4000",
    "mu": "http://localhost:4002",
    "cu": "http://localhost:4004"
  },
  "wallets": {
    "aoWallet": "./wallets/ao-wallet.json"
  },
  "bootstrap": {
    "transactions": {
      "scheduler": "..."
    }
  }
}
```

## Example Output

```bash
$ npm test

🔧 Setting up test environment...

📦 Deploying AOS module (7.82 MB)...
✅ Module deployed: abc123...

✅ Test environment ready! Module: abc123...

✔ AO Localnet - Module Tests > should verify module was deployed (123ms)
✔ AO Localnet - Module Tests > should have correct module tags (45ms)
✔ AO Localnet - Spawn Tests > should spawn a new AO process (234ms)
✔ AO Localnet - Spawn Tests > should spawn multiple processes (456ms)
✔ AO Localnet - Message Tests > should send a message (189ms)

✅ All tests passed!
```

## Troubleshooting

### Test Timeout
If tests timeout, increase the timeout in test files:
```typescript
it('slow test', { timeout: 60000 }, async () => {
  // ...
});
```

### Connection Errors
Make sure ao-localnet is running:
```bash
docker compose ps  # Check services are up
```

### Module Deployment Fails
Check ArLocal is healthy:
```bash
curl http://localhost:4000/healthcheck
```

### Wallet Issues
Verify your wallet exists:
```bash
ls -la ../wallets/ao-wallet.json
```

## Writing New Tests

```typescript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { connect } from '@permaweb/aoconnect';
import { setupTests } from './setup.js';
import { getLocalnetUrls } from './utils/config.js';

describe('My New Test Suite', () => {
  let moduleId: string;
  
  before(async () => {
    moduleId = await setupTests();
  });

  it('should do something', async () => {
    // Your test here
    assert.ok(true);
  });
});
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npx ao-localnet start
      - run: cd tests && npm install && npm test
```

## Learn More

- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [aoconnect Documentation](https://github.com/permaweb/aoconnect)
- [AO Documentation](https://ao.arweave.dev)

