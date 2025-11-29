# Auto-Seed Implementation

## Overview

The AO Localnet client now includes automatic detection and seeding of critical bootstrap data (scheduler location and AOS module). This prevents common "scheduler location not found" errors that occur when:

1. The localnet is restarted with data cleared
2. The config file is manually edited or corrupted  
3. Services are stopped and started across different sessions

## How It Works

### Detection

When the `LocalnetClient` starts services (via `start()` or `restart()`), it automatically:

1. Checks if the scheduler location transaction exists in arlocal
2. Checks if the AOS module transaction exists in arlocal
3. If either is missing, triggers automatic re-seeding

### Seeding

The seeding process:

1. Runs the existing `seed/seed-for-aos.sh` script
2. Publishes the scheduler location transaction to arlocal
3. Publishes the AOS module transaction to arlocal
4. Updates the `.ao-localnet.config.json` with the new transaction IDs
5. Mines blocks to confirm the transactions

## API

### New Functions

```typescript
/**
 * Check if scheduler location exists in arlocal
 * @param forceReload - Force reload the config before checking
 */
export async function verifySchedulerLocation(forceReload = false): Promise<boolean>

/**
 * Check if AOS module exists in arlocal
 * @param forceReload - Force reload the config before checking
 */
export async function verifyAosModule(forceReload = false): Promise<boolean>

/**
 * Ensure the localnet is properly seeded
 * Checks if scheduler location and AOS module exist, and seeds if missing
 * 
 * @param options.force - Force re-seeding even if data exists
 * @param options.onProgress - Callback for progress updates
 * @returns true if seeding was performed, false if already seeded
 */
export async function ensureSeeded(options?: {
  force?: boolean;
  onProgress?: (message: string) => void;
}): Promise<boolean>
```

### LocalnetStartOptions

A new option has been added to `LocalnetStartOptions`:

```typescript
interface LocalnetStartOptions {
  // ... existing options ...
  
  /**
   * Whether to automatically seed if scheduler location or AOS module are missing
   * @default true
   */
  autoSeed?: boolean;
}
```

## Usage

### Automatic (Default)

By default, auto-seeding is enabled:

```typescript
import { LocalnetClient } from 'ao-localnet';

const client = new LocalnetClient();

// Auto-seeding happens automatically
await client.start({
  waitForHealthy: true,
  onProgress: (msg) => console.log(msg),
});
```

### Manual Control

You can disable auto-seeding if needed:

```typescript
// Disable auto-seed
await client.start({
  autoSeed: false,
  waitForHealthy: true,
});

// Or manually trigger seeding
import { ensureSeeded } from 'ao-localnet';

await ensureSeeded({
  force: false,  // Only seed if missing
  onProgress: (msg) => console.log(msg),
});
```

### Force Re-seed

Force a complete re-seed even if data exists:

```typescript
import { ensureSeeded } from 'ao-localnet';

await ensureSeeded({
  force: true,
  onProgress: (msg) => console.log(msg),
});
```

## Example Output

When auto-seeding detects missing data:

```
🚀 Starting AO Localnet...
🐳 Starting containers...
⏳ Waiting for services to be healthy...
   ✅ arlocal is ready
   ✅ mu is ready
   ... (all services) ...
🔍 Checking if seeding is required...
⚠️  Scheduler location missing - re-seeding required
⚠️  AOS module missing - re-seeding required
📦 Seeding localnet...
scheduler location publisher address: s2yVCqphh0smC01A0feRoL_nMvcIS0bnhW6itEIengc
POST /tx
200 OK
tx id : y_lEenrY500SUpVCHcx6PKuPhrcPnuykF_fFRmrXG34
✅ Saved scheduler location to config: y_lEenrY500SUpVCHcx6PKuPhrcPnuykF_fFRmrXG34
aos publisher address: _xRBR7Y32SO7v8fHImuh3CpvRcYEvBLPvcLGerBO2t4
POST /tx
200 OK
aos module: ZxHSGXJKfvo3jazKzP7V9ITc3xoprKuhyK5kuPlYZTQ
✅ Saved AOS module to config: ZxHSGXJKfvo3jazKzP7V9ITc3xoprKuhyK5kuPlYZTQ
✅ Localnet seeded successfully
✅ Localnet started successfully!
```

## Implementation Details

### Config Cache Management

The verification functions support cache invalidation:

- `verifySchedulerLocation(true)` - Forces config reload before checking
- `verifyAosModule(true)` - Forces config reload before checking

This ensures that after seeding, the new transaction IDs are correctly verified.

### Error Handling

- Auto-seeding errors are logged as warnings but don't fail the start operation
- Users can still manually run `pnpm run seed` if needed
- The system gracefully degrades if seeding fails

### Performance

- Verification only checks if transactions exist (fast HTTP HEAD/GET)
- Seeding only runs when actually needed
- No performance impact on normal operations when data is present

## Testing

Run the auto-seed test:

```bash
node tests/test-auto-seed-full.mjs
```

This test:
1. Backs up the current config
2. Clears scheduler location and module from config
3. Verifies they're missing
4. Restarts with auto-seed enabled
5. Verifies they were automatically restored

## Benefits

1. **Improved Reliability**: No more "scheduler location not found" errors
2. **Better UX**: Users don't need to manually run `pnpm run seed`
3. **Self-Healing**: The system automatically recovers from missing bootstrap data
4. **Transparent**: Clear logging shows when and why re-seeding occurs
5. **Configurable**: Can be disabled if needed for specific use cases

## Common Scenarios

### Scenario 1: Fresh Start

```typescript
// First time starting - no seed exists
const client = new LocalnetClient();
await client.start();
// → Auto-detects missing data and seeds automatically
```

### Scenario 2: Restart After Data Clear

```typescript
// Non-persistent restart (clears data)
await client.restart({ persist: false });
// → Auto-detects missing scheduler location and re-seeds
```

### Scenario 3: Manual Config Edit

If someone manually edits `.ao-localnet.config.json` and removes the scheduler location:

```typescript
await client.start();
// → Auto-detects missing scheduler location and re-seeds
```

## Migration

For existing users:

- No changes required - auto-seeding is enabled by default
- Existing manual seeding workflows still work
- The `pnpm run seed` command is still available and functional

## Future Enhancements

Potential improvements:

1. **Selective Seeding**: Only seed what's missing (scheduler OR module)
2. **Seed Validation**: Verify seeded data is actually usable
3. **Seed Caching**: Cache seed artifacts to speed up re-seeding
4. **Network Seeding**: Support seeding from remote sources

