# Test Suite Documentation

## Overview

This directory contains comprehensive tests for the ao-localnet-archive, including tests for the arlocal-proxy auto-mining functionality.

## Test Files

### Core Tests

- **`config.test.ts`** - Configuration validation and Docker Compose generation
- **`module.test.ts`** - WASM module deployment and verification
- **`spawn.test.ts`** - Process spawning with various configurations
- **`message.test.ts`** - Message sending and result reading
- **`pingpong.test.ts`** - Inter-process communication and cranking
- **`ratelimit.test.ts`** - Load testing with 100 messages and 30 process spawning

### Proxy Tests

- **`proxy.test.ts`** - Arlocal-proxy auto-mining functionality (NEW!)

## Running Tests

### All Tests
```bash
pnpm test
```

### Individual Test Suites
```bash
pnpm run test:config      # Configuration tests
pnpm run test:module      # Module deployment tests
pnpm run test:spawn       # Process spawning tests
pnpm run test:message     # Message tests
pnpm run test:pingpong    # Ping-pong communication tests
pnpm run test:ratelimit   # Rate limit and load tests
pnpm run test:proxy       # Arlocal-proxy auto-mining tests
```

### Watch Mode
```bash
pnpm run test:watch
```

## Proxy Test Suite

### What It Tests

The `proxy.test.ts` suite comprehensively tests the arlocal-proxy auto-mining functionality:

#### 1. Transparent Proxying (3 tests)
- ✅ Forwards GET /info requests correctly
- ✅ Forwards GET /tx_anchor requests correctly
- ✅ Forwards GET /price requests correctly

#### 2. GET Requests - No Mining (2 tests)
- ✅ Does NOT mine after GET /info
- ✅ Does NOT mine after GET /mint

#### 3. POST Transactions - Auto Mining (2 tests)
- ✅ Auto-mines after posting a transaction
- ✅ Auto-mines multiple transactions sequentially

#### 4. Manual Mining Still Works (2 tests)
- ✅ Allows manual /mine calls without issues
- ✅ Allows manual /mine with count parameter

#### 5. Transaction Availability (2 tests)
- ✅ Makes mined transactions immediately available
- ✅ Confirms transaction status as confirmed

#### 6. Performance (1 test)
- ✅ Mines blocks quickly (< 200ms)

#### 7. Edge Cases (2 tests)
- ✅ Handles rapid consecutive transactions
- ✅ Does not create infinite mining loops

### Test Results

```
tests 14
suites 8
pass 14
fail 0
duration ~11s
```

### Sample Output

```bash
🧪 Arlocal Proxy Tests
   Gateway: http://localhost:4000
   Wallet: tg4CIu6aPb48i3KzvGQt0v9vaIEPt1Yc2c7jss0tJV0

✅ Proxied /info: height 1798, blocks 1799
✅ GET requests don't trigger mining: height 1798 → 1798
✅ Auto-mining worked! Height: 1798 → 1799
✅ Auto-mined 3 transactions! Height: 1799 → 1802
✅ Manual mining works: 1802 → 1803
✅ Transaction immediately available after auto-mine
✅ Transaction status confirmed
✅ Fast auto-mining: 54ms
✅ Handled 5 rapid transactions with auto-mining
✅ No infinite loop: /mine doesn't trigger auto-mining
```

### What Gets Verified

1. **Proxy Functionality**
   - All requests forwarded correctly to arlocal
   - Responses returned unchanged
   - Health checks working

2. **Auto-Mining Behavior**
   - POST /tx triggers mining
   - POST /chunk triggers mining
   - GET requests do NOT trigger mining
   - /mine endpoint itself does NOT trigger recursive mining

3. **Performance**
   - Mining completes in < 200ms
   - Non-blocking (responses not delayed)
   - Handles concurrent requests

4. **Data Availability**
   - Transactions immediately queryable after mining
   - Transaction status shows as confirmed
   - Block height increases correctly

5. **Edge Cases**
   - Rapid consecutive transactions handled correctly
   - Manual mining still works
   - No infinite loops
   - Queue management working

## Prerequisites for Tests

Before running tests, ensure:

```bash
# 1. Services are running
pnpm start

# 2. Network is seeded
pnpm run seed

# 3. SDK is built
pnpm run build
```

## Test Utilities

### `setup.ts`
Central test setup that:
- Mints tokens for test wallet
- Deploys AOS module
- Returns module ID for use in tests

### `utils/config.ts`
Configuration helpers:
- `getLocalnetUrls()` - Get service URLs
- `getScheduler()` - Get scheduler address
- `getAoWallet()` - Load test wallet

### `utils/deployModule.ts`
Module deployment utilities for tests

### `utils/mintTokens.ts`
Token minting utilities for test wallet

## Writing New Tests

Follow this pattern for new test files:

```typescript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { setupTests } from './setup.js';
import { getLocalnetUrls } from './utils/config.js';

describe('My New Test Suite', () => {
  let moduleId: string;

  before(async () => {
    // Setup runs once before all tests
    moduleId = await setupTests();
  });

  it('should do something', async () => {
    // Your test here
    assert.ok(true);
  });
});
```

## Debugging Tests

### View Proxy Logs During Tests
```bash
# In another terminal
pnpm run logs:proxy
```

### Run Individual Test
```bash
tsx --test tests/proxy.test.ts
```

### Add Debug Logging
```typescript
console.log('Debug info:', someVariable);
```

## CI/CD Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Start services
  run: pnpm start

- name: Seed network
  run: pnpm run seed

- name: Build SDK
  run: pnpm run build

- name: Run tests
  run: pnpm test
```

## Known Issues

### Chunked Data Download Warnings

You may see warnings like:
```
Error while trying to download chunked data for <TX_ID>
Falling back to gateway cache
```

This is expected in arlocal and doesn't affect test results. The Arweave SDK falls back to an alternative retrieval method.

## Performance Notes

- **Proxy tests**: ~11 seconds (includes wait times for mining)
- **All tests**: ~2-3 minutes (includes spawning, messaging, etc.)
- **Auto-mining latency**: 40-100ms per transaction

## Future Test Improvements

Potential enhancements:

- [ ] Stress testing with 100+ concurrent transactions
- [ ] Network failure recovery tests
- [ ] Proxy restart/recovery tests
- [ ] Performance benchmarking suite
- [ ] Integration tests with real AO processes
- [ ] E2E workflow tests (spawn → message → result)

## Support

For issues or questions:
- Check test output for detailed error messages
- Review service logs: `docker compose logs <service>`
- Join [Marshal Discord](https://discord.gg/KzSRvefPau)

---

**All tests passing = your localnet is fully operational!** ✅

