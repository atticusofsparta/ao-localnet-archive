# MU Rate Limit Configuration Fix

## Problem

The MU service was configured with **incorrect environment variables** that don't exist in its `config.js` file. After examining the actual MU source code, we discovered:

### Incorrect Variables (Not Used by MU)
- ❌ `DEFAULT_RATE_LIMIT` - doesn't exist in MU config
- ❌ `RATE_LIMIT_PER_MINUTE` - doesn't exist
- ❌ `RATE_LIMIT_ENABLED` - doesn't exist  
- ❌ `DISABLE_RATE_LIMIT` - doesn't exist
- ❌ `NO_RATE_LIMIT` - doesn't exist

### Correct Variables (Actually Used by MU)
Based on MU's `src/config.js`:

```javascript
IP_WALLET_RATE_LIMIT: process.env.IP_WALLET_RATE_LIMIT || 2000,
IP_WALLET_RATE_LIMIT_INTERVAL: process.env.IP_WALLET_RATE_LIMIT_INTERVAL || 1000 * 60 * 60,
```

- **`IP_WALLET_RATE_LIMIT`**: Maximum number of requests allowed (default: 2000)
- **`IP_WALLET_RATE_LIMIT_INTERVAL`**: Time window in milliseconds (default: 1 hour)

## Solution

Updated `config.mjs` to generate the MU `.env` file with the **correct** environment variables.

### Implementation

```javascript
// In config.mjs
export async function generateMuEnv(config) {
  const envContent = `NODE_CONFIG_ENV=development
DEBUG=*
PORT=80

PATH_TO_WALLET=/usr/app/ao-wallet.json

CU_URL=http://cu
GATEWAY_URL=http://arlocal
ARWEAVE_URL=http://arlocal
GRAPHQL_URL=http://arlocal/graphql
UPLOADER_URL=http://bundler

TASK_QUEUE_MAX_RETRIES=0

# Disable rate limiting for local development
# Setting to very high limit (effectively unlimited for testing)
IP_WALLET_RATE_LIMIT=999999
IP_WALLET_RATE_LIMIT_INTERVAL=1000
`;
  
  writeFileSync(muEnvPath, envContent, 'utf8');
  console.log(`✅ Generated MU .env with wallet address: ${aoWalletAddress}`);
}
```

### Configuration Details

**Our Settings:**
- `IP_WALLET_RATE_LIMIT=999999` → 999,999 requests allowed
- `IP_WALLET_RATE_LIMIT_INTERVAL=1000` → per 1000ms (1 second)

**Result:** **999,999 requests per second** - effectively unlimited for local testing ✅

**MU Default:**
- `IP_WALLET_RATE_LIMIT=2000` → 2,000 requests
- `IP_WALLET_RATE_LIMIT_INTERVAL=3600000` → per 3,600,000ms (1 hour)

**Default Result:** 2,000 requests per hour

## Verification

### Generated MU .env File
```bash
$ cat services/mu/.env
NODE_CONFIG_ENV=development
DEBUG=*
PORT=80

PATH_TO_WALLET=/usr/app/ao-wallet.json

CU_URL=http://cu
GATEWAY_URL=http://arlocal
ARWEAVE_URL=http://arlocal
GRAPHQL_URL=http://arlocal/graphql
UPLOADER_URL=http://bundler

TASK_QUEUE_MAX_RETRIES=0

# Disable rate limiting for local development
# Setting to very high limit (effectively unlimited for testing)
IP_WALLET_RATE_LIMIT=999999
IP_WALLET_RATE_LIMIT_INTERVAL=1000
```

### Config Apply Output
```bash
$ pnpm run config:apply
✅ Generated MU .env with wallet address: 1nEDSZp5JilnSpbHIsA4V8YBwQmqnSL3-iQCvBJwAy4
✅ Configuration applied successfully!
```

## Usage

### First Time Setup
```bash
# Generate configuration with correct MU variables
pnpm run config:apply

# Start services
pnpm start
```

### After Updating Configuration
```bash
# Regenerate config
pnpm run config:apply

# Restart services to pick up new config
pnpm stop && pnpm start
```

## Benefits

✅ **Correct variables**: Now using the exact variables that MU's `config.js` reads  
✅ **Effectively unlimited**: 999,999 requests per second for local testing  
✅ **Automatic generation**: Running `config:apply` handles everything  
✅ **Persistent**: Configuration survives Docker restarts  
✅ **No manual edits**: `.env` file is auto-generated from config

## Technical Details

### MU Config Schema
From `servers/mu/src/config.js`:

```javascript
export const domainConfigSchema = z.object({
  // ... other config
  IP_WALLET_RATE_LIMIT: positiveIntSchema,
  IP_WALLET_RATE_LIMIT_INTERVAL: positiveIntSchema,
  RATE_LIMIT_FILE_URL: z.string().optional(),
  // ...
})
```

### How Rate Limiting Works in MU
1. MU reads `IP_WALLET_RATE_LIMIT` and `IP_WALLET_RATE_LIMIT_INTERVAL` from environment
2. These values configure the rate limiter for wallet-based requests
3. Setting a very high limit (999999) effectively disables rate limiting
4. The interval of 1000ms (1 second) means the limit resets every second

## Files Modified

1. **config.mjs**
   - Updated `generateMuEnv()` to use correct variables
   - Removed non-existent variables

2. **services/mu/.env** (auto-generated)
   - Now contains only variables that MU actually reads
   - Properly configured for unlimited local testing

## Related Documentation

- **MU_WHITELIST_SUMMARY.md**: Original investigation (outdated)
- **CHANGELOG.md**: Version history with this fix
- **README.md**: Updated quick start guide

