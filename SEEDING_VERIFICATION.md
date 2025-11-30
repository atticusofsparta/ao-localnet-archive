# Seeding Verification & Auto-Healing

The AO Localnet now includes comprehensive seeding verification and automatic healing to ensure your localnet environment is properly configured.

## Overview

The seeding system:
- ✅ **Verifies** transactions exist in arlocal
- ✅ **Checks** accessibility of seeded data
- ✅ **Validates** wallet balances (optional)
- ✅ **Provides** detailed feedback on issues
- ✅ **Auto-heals** by re-seeding when problems detected

## Quick Start

### Automatic Verification

When starting the localnet with `LocalnetClient`, verification happens automatically:

```typescript
import { LocalnetClient } from 'ao-localnet/client';

const client = new LocalnetClient();

await client.start({
  autoSeed: true, // Enabled by default
  waitForHealthy: true,
  onProgress: (msg) => console.log(msg),
});
```

**Output:**
```
🚀 Starting AO Localnet...
🐳 Starting containers...
⏳ Waiting for services to be healthy...
🔍 Checking if seeding is required...
🔍 Verifying localnet seeding status...
✅ Localnet is properly seeded
✅ Localnet started successfully!
```

### Manual Verification

Check seeding status programmatically:

```typescript
import { getSeedingStatus } from 'ao-localnet';

// Basic verification
const status = await getSeedingStatus(false);

console.log('Is seeded:', status.isSeeded);
console.log('Scheduler location:', status.schedulerLocation);
console.log('AOS module:', status.aosModule);
console.log('Issues:', status.issues);

// Detailed verification (includes wallet balances)
const detailedStatus = await getSeedingStatus(true);

if (detailedStatus.walletBalances) {
  console.log('Wallet balances:', detailedStatus.walletBalances);
}
```

### Force Re-seeding

```typescript
import { ensureSeeded } from 'ao-localnet';

await ensureSeeded({
  force: true, // Force re-seed even if appears seeded
  verify: true, // Use comprehensive verification
  onProgress: (msg) => console.log(msg),
});
```

## Seeding Status Interface

```typescript
interface SeedingStatus {
  isSeeded: boolean;
  
  schedulerLocation: {
    exists: boolean;           // Config has scheduler location TX ID
    txId: string | null;       // The transaction ID
    accessible: boolean;       // Transaction exists in arlocal
    error?: string;            // Error message if not accessible
  };
  
  aosModule: {
    exists: boolean;           // Config has AOS module TX ID
    txId: string | null;       // The transaction ID
    accessible: boolean;       // Transaction exists in arlocal
    error?: string;            // Error message if not accessible
  };
  
  walletBalances: {            // Only included when verbose=true
    scheduler: { 
      address: string; 
      balance: number; 
      sufficient: boolean;
    };
    aosPublisher: { 
      address: string; 
      balance: number; 
      sufficient: boolean; 
    };
    bundler: { 
      address: string; 
      balance: number; 
      sufficient: boolean; 
    };
    ao: { 
      address: string; 
      balance: number; 
      sufficient: boolean; 
    };
  } | null;
  
  issues: string[];           // List of detected issues
  lastBootstrap: string | null; // Last seeding timestamp
}
```

## Common Issues & Solutions

### Issue: "Scheduler location transaction not accessible"

**Cause:** The config has a scheduler location TX ID, but it doesn't exist in arlocal.

**Solution:** Re-seed the localnet:
```bash
pnpm run seed
```

Or use auto-healing:
```typescript
await ensureSeeded({ verify: true });
```

### Issue: "AOS module not configured in bootstrap"

**Cause:** The `.ao-localnet.config.json` doesn't have bootstrap data.

**Solution:** Seed the localnet:
```bash
pnpm run seed
```

### Issue: "Wallet has insufficient balance"

**Cause:** A required wallet doesn't have enough AR tokens.

**Solution:** The seed script automatically mints tokens. Re-run:
```bash
pnpm run seed
```

### Issue: Stale config after clearing arlocal data

**Cause:** You cleared the `.ao-localnet/arlocal` directory but config still has old TX IDs.

**Solution:** The verification system detects this automatically:
```typescript
await ensureSeeded({ verify: true }); // Auto-heals
```

## Enhanced Verification Mode

The `ensureSeeded()` function now supports comprehensive verification:

```typescript
await ensureSeeded({
  verify: true, // Enable detailed verification (default: true)
  force: false, // Don't re-seed if already seeded (default: false)
  onProgress: (msg) => console.log(msg),
});
```

**What it checks:**
1. ✅ Scheduler location TX exists in config
2. ✅ Scheduler location TX is accessible via arlocal
3. ✅ AOS module TX exists in config
4. ✅ AOS module TX is accessible via arlocal
5. ✅ Returns specific error messages for each issue

**Output example:**
```
🔍 Verifying localnet seeding status...
⚠️  Seeding issues detected:
   - Scheduler location transaction not accessible (HTTP 404: Not Found)
   - AOS module not configured in bootstrap
🔧 Re-seeding required...
📦 Seeding localnet...
🔍 Verifying seed completed successfully...
✅ Localnet seeded successfully
```

## Backwards Compatibility

Old code continues to work without changes:

```typescript
// Still supported - uses simple verification
await ensureSeeded();

// Still supported - simple checks
const hasScheduler = await verifySchedulerLocation();
const hasModule = await verifyAosModule();
```

## CLI Usage

Check seeding status from command line:

```bash
# Check if seeded
pnpm test:seeding-status

# Force re-seed
pnpm run seed
```

## LocalnetClient Integration

The `LocalnetClient` automatically uses enhanced verification:

```typescript
const client = new LocalnetClient();

await client.start({
  autoSeed: true,        // Automatically seed if needed (default: true)
  waitForHealthy: true,  // Wait for services to be ready (default: true)
  onProgress: (msg) => console.log(msg),
});
```

**Benefits:**
- ✅ No manual seeding required
- ✅ Automatic detection of seeding issues
- ✅ Clear feedback on what's wrong
- ✅ Auto-healing when problems detected
- ✅ Helpful error messages with solutions

## Diagnostic Script

Create a diagnostic script to check your localnet health:

```typescript
import { getSeedingStatus } from 'ao-localnet';

async function diagnose() {
  console.log('🔍 Diagnosing localnet seeding...\n');
  
  const status = await getSeedingStatus(true); // verbose
  
  console.log('Status:', status.isSeeded ? '✅ Seeded' : '❌ Not seeded');
  console.log('\nScheduler Location:');
  console.log('  TX ID:', status.schedulerLocation.txId);
  console.log('  Accessible:', status.schedulerLocation.accessible);
  
  console.log('\nAOS Module:');
  console.log('  TX ID:', status.aosModule.txId);
  console.log('  Accessible:', status.aosModule.accessible);
  
  if (status.walletBalances) {
    console.log('\nWallet Balances:');
    Object.entries(status.walletBalances).forEach(([name, info]) => {
      console.log(`  ${name}:`, info.sufficient ? '✅' : '❌', 
                  `${info.balance} (${info.address.slice(0, 8)}...)`);
    });
  }
  
  if (status.issues.length > 0) {
    console.log('\n⚠️  Issues:');
    status.issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  console.log('\nLast Bootstrap:', status.lastBootstrap);
}

diagnose();
```

## Testing

Run the seeding verification tests:

```bash
pnpm test tests/seeding-verification.test.ts
```

## Best Practices

1. **Always use auto-seed in development:**
   ```typescript
   await client.start({ autoSeed: true });
   ```

2. **Check status before critical operations:**
   ```typescript
   const status = await getSeedingStatus(false);
   if (!status.isSeeded) {
     await ensureSeeded({ verify: true });
   }
   ```

3. **Provide feedback to users:**
   ```typescript
   await ensureSeeded({
     verify: true,
     onProgress: (msg) => console.log(msg),
   });
   ```

4. **Use force re-seed for clean state:**
   ```typescript
   await client.reset(); // Clears all data and re-seeds
   ```

## Troubleshooting

### Services start but no transactions found

**Problem:** Docker containers are running but arlocal has no data.

**Solution:**
```typescript
await ensureSeeded({ force: true, verify: true });
```

### Verification timeout

**Problem:** Network requests to arlocal timeout.

**Solution:** Ensure arlocal service is healthy:
```typescript
import { isServiceHealthy } from 'ao-localnet';
const healthy = await isServiceHealthy('arlocal');
console.log('Arlocal healthy:', healthy);
```

### Config has old transaction IDs

**Problem:** Config from previous run has stale data.

**Solution:** Verification detects this automatically and re-seeds:
```typescript
await ensureSeeded({ verify: true }); // Auto-fixes
```

## Summary

The enhanced seeding verification:
- ✅ Provides clear feedback on seeding status
- ✅ Automatically detects and fixes seeding issues
- ✅ Gives actionable error messages
- ✅ Validates both config and actual arlocal data
- ✅ Works seamlessly with LocalnetClient
- ✅ Maintains backwards compatibility

No more silent failures or mysterious seeding issues!

