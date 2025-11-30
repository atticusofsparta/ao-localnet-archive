# E2E Test Suite for ao-localnet

This directory contains end-to-end tests that simulate how a real implementation project would use `ao-localnet` as a dependency.

## Purpose

These tests verify that:
1. The package can be installed and imported correctly
2. All SDK exports work as expected
3. The `LocalnetClient` can manage Docker services
4. Auto-seeding functionality works in consumer projects
5. Rate limits are properly disabled
6. Wallets are loaded from the project directory (not the installation directory)
7. The package works seamlessly when used as a dependency

## Directory Structure

```
e2e-test/
├── package.json           # Simulated consumer project
├── setup.sh               # Installation script
├── README.md             # This file
└── test/
    ├── 01-basic-usage.test.mjs       # Test SDK imports and basic usage
    ├── 02-client-management.test.mjs # Test LocalnetClient
    ├── 03-auto-seed.test.mjs         # Test auto-seeding
    ├── 04-rate-limit.test.mjs        # Test rate limit fix
    └── 05-wallet-loading.test.mjs    # Test wallet path resolution
```

## Setup

From the `e2e-test` directory:

```bash
# Run the setup script
pnpm run setup

# Or manually:
bash setup.sh
```

This will:
1. Clean any previous installations
2. Install the parent `ao-localnet` package as a dependency
3. Verify the installation
4. Ensure the SDK is built

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Individual Test Suites

```bash
pnpm test:basic        # Test 1: Basic SDK usage
pnpm test:client       # Test 2: LocalnetClient management
pnpm test:auto-seed    # Test 3: Auto-seeding
pnpm test:rate-limit   # Test 4: Rate limit verification
pnpm test:wallet       # Test 5: Wallet loading from project directory
```

## What Each Test Does

### Test 1: Basic SDK Usage (`01-basic-usage.test.mjs`)

✅ Can import the package  
✅ Can import SDK functions (`getAoInstance`, `getScheduler`, etc.)  
✅ Can import `LocalnetClient`  
✅ Can get URLs and configuration  
✅ Can create AO instances and signers  
✅ Can retrieve scheduler and module IDs

### Test 2: Client Management (`02-client-management.test.mjs`)

✅ Can create LocalnetClient instance  
✅ Can get service status  
✅ Can check if services are healthy  
✅ Can retrieve service logs  
✅ Can restart services with auto-seed enabled  
✅ Services remain healthy after restart

### Test 3: Auto-Seeding (`03-auto-seed.test.mjs`)

✅ Can verify scheduler location exists  
✅ Can verify AOS module exists  
✅ `ensureSeeded()` function works correctly  
✅ Can spawn processes with auto-seeded data  
✅ LocalnetClient auto-seeds on start  
✅ Services function correctly after auto-seeding

### Test 4: Rate Limit Verification (`04-rate-limit.test.mjs`)

✅ Can send rapid burst of 25 messages  
✅ Can spawn 5 processes in parallel  
✅ Can run high-frequency message loop  
✅ Zero rate limit errors in all scenarios  
✅ Achieves high throughput (25+ msg/sec)

### Test 5: Wallet Loading (`05-wallet-loading.test.mjs`)

✅ Loads AO wallet from project directory  
✅ Loads bundler wallet from project directory  
✅ `getAuthority()` uses project wallet  
✅ `getBundlerAddress()` uses project wallet  
✅ Wallet addresses match config bootstrap data  
✅ `loadWallet()` prioritizes project directory over installation directory  
✅ Helpful error messages for missing wallets  
✅ `createAoSigner()` works with project wallet  
✅ `createBundlerSigner()` works with project wallet

## Expected Output

Successful test run looks like:

```
✔ E2E: Basic SDK Usage (123ms)
  ✔ can import package (45ms)
  ✔ can import SDK functions (12ms)
  ✔ can import LocalnetClient (8ms)
  ✔ can get URLs (15ms)
  ✔ can load config (10ms)
  ✔ can get AO instance (18ms)
  ✔ can create signer (5ms)
  ✔ can get scheduler and module IDs (10ms)

✔ E2E: LocalnetClient Management (15.2s)
  ✔ can create LocalnetClient instance (3ms)
  ✔ can get service status (234ms)
  ✔ can check if services are healthy (5ms)
  ✔ can get logs from a service (156ms)
  ✔ client restart works with options (14.8s)

✔ E2E: Auto-Seeding (8.5s)
  ✔ can verify scheduler location (123ms)
  ✔ can verify AOS module (98ms)
  ✔ ensureSeeded function works (2.1s)
  ✔ can spawn process with auto-seeded data (3.2s)
  ✔ LocalnetClient auto-seeds on start (3.0s)

✔ E2E: Rate Limit Verification (5.8s)
  ✔ can send rapid burst of messages (2.1s)
  ✔ can spawn processes in parallel (1.8s)
  ✔ can run high-frequency message loop (1.9s)

# tests 24
# pass 24
# fail 0
```

## Prerequisites

1. **Parent package must be built**:
   ```bash
   cd /Volumes/primary_all/ao-localnet-archive
   pnpm run build
   ```

2. **Docker must be running**:
   ```bash
   docker ps  # Should not error
   ```

3. **Localnet services must be up**:
   ```bash
   cd /Volumes/primary_all/ao-localnet-archive
   pnpm start
   ```

## Troubleshooting

### Tests fail with "Cannot find package 'ao-localnet'"

Run the setup script:
```bash
pnpm run setup
```

### Tests fail with connection errors

Ensure the localnet is running:
```bash
cd /Volumes/primary_all/ao-localnet-archive
pnpm start
```

### Tests fail with "scheduler location not found"

The parent localnet needs to be seeded:
```bash
cd /Volumes/primary_all/ao-localnet-archive
pnpm run seed
```

Or rely on auto-seeding in the tests.

### Docker errors

Ensure Docker is running and healthy:
```bash
docker ps
docker info
```

## Clean Up

To remove the e2e test installation:

```bash
pnpm run clean
```

This removes `node_modules` and `pnpm-lock.yaml`.

## Integration with CI/CD

You can integrate this into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Setup ao-localnet
  run: |
    cd /path/to/ao-localnet-archive
    pnpm install
    pnpm run build
    pnpm start

- name: Run E2E tests
  run: |
    cd /path/to/ao-localnet-archive/e2e-test
    pnpm run setup
    pnpm test
```

## What This Tests

This E2E suite validates the **entire user journey**:

1. **Installation** - Package can be installed as a dependency
2. **Import** - All exports are accessible
3. **Configuration** - Config is loaded from the parent package
4. **Functionality** - SDK functions work correctly
5. **Client Management** - LocalnetClient can control services
6. **Auto-Healing** - Auto-seeding prevents common errors
7. **Performance** - Rate limits don't interfere with testing
8. **Reliability** - Services remain stable through restarts

## Success Criteria

All tests passing means:
- ✅ Package is ready for distribution
- ✅ Users can `pnpm add ao-localnet` and start using it
- ✅ Auto-seeding prevents setup friction
- ✅ Rate limits won't interfere with development
- ✅ LocalnetClient provides robust service management
- ✅ The package works as designed in real-world scenarios

## Notes

- Tests use the **actual parent package** (not a published version)
- This simulates using `pnpm link` or `file:` dependency
- Tests run against the **live Docker environment**
- Some tests may take 15-30 seconds due to service restarts
- Tests are idempotent and can be run multiple times

## Support

If tests fail unexpectedly, check:
1. Parent package is built (`dist/` directory exists)
2. Docker daemon is running
3. Localnet services are healthy
4. No port conflicts (4000-4008)
5. Sufficient disk space for Docker volumes

