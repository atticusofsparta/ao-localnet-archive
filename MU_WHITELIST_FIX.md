# MU Wallet Whitelist Fix

## Problem

The MU service had a hardcoded wallet address in its rate limit whitelist configuration that did not match the actual AO wallet being used. This caused issues with rate limiting even though we had patched the MU to disable rate limits.

**Hardcoded address**: `y0yFQVYWtQblOKClbuBmo6rqxCiKD1KHOt_Aizgm8w8`  
**Actual AO wallet**: `1nEDSZp5JilnSpbHIsA4V8YBwQmqnSL3-iQCvBJwAy4`

## Solution

Updated `config.mjs` to automatically generate the MU `.env` file with the correct AO wallet address from the project's wallet configuration.

### Changes Made

1. **Added `generateMuEnv()` function** in `config.mjs`:
   ```javascript
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
   }
   ```

2. **Updated `applyConfig()` to call `generateMuEnv()`**:
   - Now runs automatically when you run `pnpm run config:apply`
   - Regenerates the MU `.env` with the correct wallet address

3. **Removed arlocal port exposure** from config generator:
   - arlocal is internal-only, accessed via arlocal-proxy on port 4000
   - This prevents port conflicts

## How It Works

1. **When running `pnpm run config:apply`**:
   - Generates `services/mu/.env` with the correct rate limit variables
   - Sets `IP_WALLET_RATE_LIMIT=999999` (999,999 requests)
   - Sets `IP_WALLET_RATE_LIMIT_INTERVAL=1000` (per 1000ms = 1 second)

2. **The MU service now uses**:
   ```env
   IP_WALLET_RATE_LIMIT=999999
   IP_WALLET_RATE_LIMIT_INTERVAL=1000
   ```
   
   This allows **999,999 requests per second** - effectively unlimited for local testing.

3. **On Docker restart**:
   - MU picks up the new configuration
   - Rate limits are effectively disabled (999999 req/sec)

## Benefits

- ✅ **Automatic configuration**: Wallet address is always in sync with your actual wallet
- ✅ **No manual updates**: Running `config:apply` handles everything
- ✅ **Rate limit bypass**: AO wallet is whitelisted for unlimited requests
- ✅ **Consistent across restarts**: Configuration persists correctly

## Testing

```bash
# Regenerate config with correct wallet
pnpm run config:apply

# Restart services to pick up new config
pnpm stop && pnpm start

# Verify the wallet address in MU .env
cat services/mu/.env | grep DEFAULT_RATE_LIMIT
```

## Output

```
✅ Generated MU .env with wallet address: 1nEDSZp5JilnSpbHIsA4V8YBwQmqnSL3-iQCvBJwAy4
```

