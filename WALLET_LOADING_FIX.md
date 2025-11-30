# Wallet Loading Fix Summary

## Issue

When `ao-localnet` was used as a dependency in another project, the `getAuthority()` and `getBundlerAddress()` functions were defaulting to loading wallets from the installation directory (e.g., `node_modules/ao-localnet/wallets/`) instead of the consumer project's wallet directory.

This caused errors like:
```
ENOENT: no such file or directory, open '/path/to/node_modules/ao-localnet/wallets/ao-wallet.json'
```

## Root Cause

The functions were directly resolving wallet paths relative to `__dirname` (the package installation directory):

```typescript
// ❌ Old implementation
export async function getAuthority(): Promise<string> {
  const config = loadConfig();
  const arweave = Arweave.init({});
  
  const walletPath = config.wallets?.aoWallet || './wallets/ao-wallet.json';
  const fullPath = resolve(__dirname, '..', walletPath);  // ⚠️ Installation directory
  const wallet = JSON.parse(readFileSync(fullPath, 'utf8'));
  
  return await arweave.wallets.jwkToAddress(wallet);
}
```

## Solution

Updated both `getAuthority()` and `getBundlerAddress()` to use the existing `loadWallet()` helper function, which correctly prioritizes the consumer project's directory:

```typescript
// ✅ New implementation
export async function getAuthority(): Promise<string> {
  const config = loadConfig();
  const arweave = Arweave.init({});
  
  const walletPath = config.wallets?.aoWallet || './wallets/ao-wallet.json';
  const wallet = loadWallet(walletPath);  // ✅ Uses smart path resolution
  
  return await arweave.wallets.jwkToAddress(wallet);
}
```

## How `loadWallet()` Works

The `loadWallet()` function tries multiple locations in order of priority:

1. **Consumer project directory** (`process.cwd()`) - **Highest Priority**
2. Package installation directory (`__dirname/../`)
3. Symlink-resolved paths (for pnpm `file:` protocol installations)

This ensures that:
- ✅ Consumer projects can use their own wallets
- ✅ Fallback to package wallets if needed
- ✅ Works with different package managers (npm, pnpm, yarn)
- ✅ Provides helpful error messages showing all tried locations

## Files Changed

### Source Code
- `src/index.ts` - Updated `getAuthority()` and `getBundlerAddress()`

### Tests
- `e2e-test/test/05-wallet-loading.test.mjs` - New comprehensive test suite
- `e2e-test/package.json` - Added `test:wallet` script
- `e2e-test/README.md` - Updated documentation

### Build Output
- `dist/index.js` - Rebuilt TypeScript output

## Test Coverage

Created comprehensive E2E test suite with 9 tests covering:

1. ✅ Load AO wallet from project directory
2. ✅ Load bundler wallet from project directory
3. ✅ `getAuthority()` uses project wallet
4. ✅ `getBundlerAddress()` uses project wallet
5. ✅ Wallet addresses match config bootstrap data
6. ✅ `loadWallet()` prioritizes project directory
7. ✅ Helpful error messages for missing wallets
8. ✅ `createAoSigner()` works with project wallet
9. ✅ `createBundlerSigner()` works with project wallet

All tests passing:
```bash
cd e2e-test && pnpm test:wallet
# ✅ 9/9 tests passed
```

## Verification

To verify the fix in your project:

```typescript
import { getAuthority, getBundlerAddress } from 'ao-localnet';

// These now load from YOUR project's ./wallets/ directory
const authority = await getAuthority();
const bundlerAddr = await getBundlerAddress();

console.log('Authority:', authority);
console.log('Bundler:', bundlerAddr);
```

If wallets are missing, you'll get a helpful error:
```
Wallet not found at: ./wallets/ao-wallet.json
Tried locations:
  - /your/project/wallets/ao-wallet.json
  - /your/project/node_modules/ao-localnet/wallets/ao-wallet.json
  - /real/path/to/ao-localnet/wallets/ao-wallet.json
Make sure wallets are generated with: pnpm run configure
```

## Impact

### Before (❌)
```
Consumer Project
├── wallets/
│   └── ao-wallet.json          ⛔ Ignored
└── node_modules/
    └── ao-localnet/
        └── wallets/
            └── ao-wallet.json  ✅ Used (wrong!)
```

### After (✅)
```
Consumer Project
├── wallets/
│   └── ao-wallet.json          ✅ Used (correct!)
└── node_modules/
    └── ao-localnet/
        └── wallets/
            └── ao-wallet.json  💾 Fallback
```

## Related Functions

The following functions already had correct path resolution (no changes needed):
- ✅ `loadWallet()` - Smart path resolution (existing)
- ✅ `getAoWallet()` - Uses `loadWallet()`
- ✅ `getBundlerWallet()` - Uses `loadWallet()`
- ✅ `createAoSigner()` - Uses `getAoWallet()`
- ✅ `createBundlerSigner()` - Uses `getBundlerWallet()`

Only these two functions needed updates:
- 🔧 `getAuthority()` - Fixed
- 🔧 `getBundlerAddress()` - Fixed

## Backwards Compatibility

This change is **backwards compatible**:
- ✅ Existing usage continues to work
- ✅ Fallback to installation directory if project wallets missing
- ✅ No breaking changes to API
- ✅ Only improves behavior when used as a dependency

## Best Practices for Consumers

When using `ao-localnet` as a dependency:

1. **Create wallets in your project**:
   ```bash
   mkdir -p wallets
   # Generate or copy your wallets to ./wallets/
   ```

2. **Configure wallet paths** in `.ao-localnet.config.json`:
   ```json
   {
     "wallets": {
       "aoWallet": "./wallets/ao-wallet.json",
       "bundlerWallet": "./wallets/bundler-wallet.json"
     }
   }
   ```

3. **Wallets are automatically found** - no additional setup needed!

## Commit Summary

- Fixed wallet loading to prioritize project directory over installation directory
- Updated `getAuthority()` and `getBundlerAddress()` to use `loadWallet()`
- Added comprehensive E2E test suite (9 tests, all passing)
- Updated documentation to reflect wallet loading behavior
- No breaking changes, fully backwards compatible

