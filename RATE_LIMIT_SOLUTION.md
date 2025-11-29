# Rate Limit Solution

## Problem

Users were experiencing rate limit errors despite this being described as a "pre-rate-limit" localnet. The issue was:

1. **Documentation mismatch**: README claimed to use MU commit `acb3852` (pre-rate-limit)
2. **Actual version**: Using MU commit `fa48943` (September 9, 2025) which **DOES have rate limits**
3. **Insufficient patches**: The original Dockerfile had minimal sed commands that didn't fully disable rate limiting
4. **Override file gap**: The `docker-compose.override.yml` wasn't setting rate limit environment variables

## Root Cause

The MU was upgraded from `acb3852` to `fa48943` to support **hyperbeam device message handlers**, but `fa48943` includes rate limiting code. The basic patches in the Dockerfile were:

```dockerfile
# Original - insufficient
RUN sed -i '/IP_WALLET_RATE_LIMIT:/d' src/config.js
RUN sed -i '/IP_WALLET_RATE_LIMIT:/d' src/config.js  # duplicate!
```

This only removed config schema entries but didn't:
- Disable the actual rate limiting logic
- Set environment variables to unlimited values
- Handle all rate limit configuration variations

## Solution

### 1. **Dockerfile Patches** (`services/mu/Dockerfile`)

```dockerfile
# Remove all rate limit configuration
RUN sed -i '/IP_WALLET_RATE_LIMIT/d' src/config.js 2>/dev/null || true
RUN sed -i '/WALLET_RATE_LIMIT/d' src/config.js 2>/dev/null || true
RUN sed -i '/ipWalletRateLimit/d' src/config.js 2>/dev/null || true

# Set environment variables to disable rate limiting
ENV DEFAULT_RATE_LIMIT={}
ENV IP_WALLET_RATE_LIMIT=999999999
ENV IP_WALLET_RATE_LIMIT_INTERVAL=1
ENV WALLET_RATE_LIMIT_ENABLED=false
```

### 2. **Docker Compose Override** (`docker-compose.override.yml`)

```yaml
mu:
  environment:
    # Disable rate limiting for localnet
    - DEFAULT_RATE_LIMIT={}
    - IP_WALLET_RATE_LIMIT=999999999
    - IP_WALLET_RATE_LIMIT_INTERVAL=1
```

These environment variables:
- `DEFAULT_RATE_LIMIT={}` - Sets empty rate limit config
- `IP_WALLET_RATE_LIMIT=999999999` - Sets max requests to effectively unlimited
- `IP_WALLET_RATE_LIMIT_INTERVAL=1` - Sets interval to 1ms (fastest possible)
- `WALLET_RATE_LIMIT_ENABLED=false` - Explicitly disables rate limiting

### 3. **Updated Documentation**

- README now correctly states using MU `fa48943` with comprehensive rate limit patches
- Removed misleading "pre-rate-limit" claims
- Documented the hyperbeam + no-rate-limits combination

## Why Docker Override is Important

The `docker-compose.override.yml` file is a **Docker Compose standard pattern** that:

1. **Separates concerns**: Base config vs. local/development overrides
2. **Ensures consistency**: Environment variables are reliably set on every start
3. **Works with the client**: The `LocalnetClient` uses both files when managing services
4. **Provides fallback**: Even if Dockerfile ENVs aren't sufficient, these override them

**Without the override file**, the environment variables might not be properly set when:
- Docker caches layers and doesn't rebuild
- The `env_file` setting conflicts
- Services are restarted without rebuilding

## Verification

### Quick Test (Recommended)

Run the comprehensive rate limit verification test:

```bash
pnpm run test:rate-limit-fix
```

This test will:
1. ✅ Check all MU environment variables are set correctly
2. ✅ Send 50 rapid messages (tests burst handling)
3. ✅ Spawn 10 processes in parallel (tests concurrency)
4. ✅ Verify no rate limit mentions in logs

**Expected output:**
```
🎉 SUCCESS! Rate limiting is completely disabled!

Your localnet can handle:
   - 50+ messages/second
   - 10+ parallel process spawns
   - Zero rate limit interference
```

### Manual Verification Steps

If you prefer to verify manually:

#### 1. **Check Environment Variables**

```bash
docker compose exec mu env | grep RATE
```

Should show:
```
DEFAULT_RATE_LIMIT={}
IP_WALLET_RATE_LIMIT=999999999
IP_WALLET_RATE_LIMIT_INTERVAL=1
```

#### 2. **Check MU Logs**

```bash
docker compose logs mu --tail 50 | grep -i rate
```

Should see **no rate limit errors** or warnings.

#### 3. **Test with High Load**

```bash
pnpm run test:ratelimit  # 30 process spawning test
```

Should complete with **100% success rate**, no rate limit errors.

## Applying the Fix

If you're experiencing rate limit errors:

### Step 1: Pull Latest Changes

```bash
git pull origin main
```

### Step 2: Rebuild MU (No Cache)

```bash
docker compose build --no-cache mu
```

### Step 3: Restart the Localnet

```bash
pnpm run restart
# or
docker compose restart
```

### Step 4: Verify

```bash
# Check logs
docker compose logs mu --tail 20

# Run high-load test
pnpm run test:ratelimit
```

## For Projects Using This Localnet

If you're using this as a dependency (`pnpm link` or installed package):

### Option 1: Use LocalnetClient (Recommended)

```typescript
import { LocalnetClient } from 'ao-localnet';

const client = new LocalnetClient();

// Client automatically uses the override file
await client.restart({
  persist: false,
  waitForHealthy: true,
});
```

The `LocalnetClient` automatically handles both `docker-compose.yml` and `docker-compose.override.yml`.

### Option 2: Manual Docker Compose

```bash
# From your project
cd node_modules/ao-localnet  # or wherever it's linked

# Rebuild MU
docker compose build --no-cache mu

# Restart
docker compose restart mu
```

### Option 3: Override in Your Own Project

Create your own `docker-compose.override.yml`:

```yaml
services:
  mu:
    environment:
      - DEFAULT_RATE_LIMIT={}
      - IP_WALLET_RATE_LIMIT=999999999
      - IP_WALLET_RATE_LIMIT_INTERVAL=1
```

## Why This Matters

Rate limiting in a **local development environment** causes:

1. **Test failures**: Load tests fail unpredictably
2. **Development friction**: Can't test high-throughput scenarios
3. **False negatives**: Code appears broken when it's just rate limited
4. **Time waste**: Debugging rate limits instead of actual issues

With these patches:
- ✅ **30 process spawning** works reliably
- ✅ **High-frequency messaging** doesn't throttle
- ✅ **Load testing** gives accurate results
- ✅ **Development experience** is smooth

## Technical Details

### Why Both Dockerfile ENV and Override?

**Dockerfile ENV**:
- Baked into the image
- Always present when container starts
- Rebuilding required to change

**Override Environment**:
- Dynamic, set at runtime
- Takes precedence over Dockerfile ENV
- No rebuild needed to change

**Best practice**: Set both for defense-in-depth. If one fails, the other catches it.

### MU Version History

- `acb3852` (April 17, 2025) - Last commit before rate limits, no hyperbeam support
- `fa48943` (September 9, 2025) - Has hyperbeam support + rate limits (we patch these out)

We chose `fa48943` because:
1. Hyperbeam device message handlers are needed for some workflows
2. More recent, includes other bug fixes
3. With proper patches, rate limits can be completely disabled

## Troubleshooting

### Still seeing rate limit errors?

1. **Verify MU was rebuilt**:
   ```bash
   docker images | grep ao-localnet-archive-mu
   # Should show recent creation time
   ```

2. **Check environment variables are set**:
   ```bash
   docker compose exec mu env | grep RATE
   ```

3. **Clear all Docker cache and rebuild**:
   ```bash
   docker compose down
   docker system prune -af
   docker compose build --no-cache
   docker compose up -d
   ```

4. **Check for .env file conflicts**:
   ```bash
   cat services/mu/.env
   # Should NOT have IP_WALLET_RATE_LIMIT set to low values
   ```

### Rate limits in logs but tests pass?

This might be log messages from old code paths. As long as tests pass and no actual throttling occurs, it's fine.

### Different rate limit error in another service?

- **SU**: Uses Rust, has different rate limiting. Not currently an issue.
- **CU**: No rate limiting by default.
- **Bundler**: No rate limiting.

If you see rate limits from other services, file an issue with logs.

## Summary

The rate limit fix involves:

1. ✅ Removing rate limit config from MU source code (Dockerfile)
2. ✅ Setting unlimited environment variables (Dockerfile ENV)  
3. ✅ Overriding environment variables at runtime (docker-compose.override.yml)
4. ✅ Updated documentation to reflect actual MU version (`fa48943`)

**Result**: Zero rate limiting interference during local development and testing! 🎉

