# MU Configuration - User Control

## Summary

The MU service rate limiting is now **fully configurable** via `.ao-localnet.config.json`. Changes to the config are automatically applied to the MU service when you run `pnpm run config:apply`.

## How It Works

### Configuration Flow

```
.ao-localnet.config.json
  ↓
config.mjs (generateMuEnv)
  ↓
services/mu/.env (generated file)
  ↓
Docker Compose (env_file: ./services/mu/.env)
  ↓
MU Container (process.env)
  ↓
MU config.js (reads IP_WALLET_RATE_LIMIT)
```

### User Configuration

In your `.ao-localnet.config.json`:

```json
{
  "services": {
    "mu": {
      "enabled": true,
      "rateLimit": {
        "maxRequests": 50000,
        "intervalMs": 3600000
      }
    }
  }
}
```

**Values:**
- `maxRequests`: Maximum number of requests allowed (default: 999999)
- `intervalMs`: Time window in milliseconds (default: 1000)

**Examples:**
- `50000` requests per `3600000`ms = 50,000 requests per hour
- `999999` requests per `1000`ms = unlimited for testing

### Defaults

If you don't specify rate limits, the system defaults to **unlimited for local testing**:

```env
IP_WALLET_RATE_LIMIT=999999
IP_WALLET_RATE_LIMIT_INTERVAL=1000
```

This gives you 999,999 requests per second - effectively unlimited.

## Usage

### View Current Configuration

```bash
cat services/mu/.env | grep IP_WALLET_RATE_LIMIT
```

Output:
```
IP_WALLET_RATE_LIMIT=50000
IP_WALLET_RATE_LIMIT_INTERVAL=3600000
```

### Change Rate Limits

1. **Edit `.ao-localnet.config.json`**:
   ```json
   {
     "services": {
       "mu": {
         "rateLimit": {
           "maxRequests": 10000,
           "intervalMs": 60000
         }
       }
     }
   }
   ```

2. **Apply configuration**:
   ```bash
   pnpm run config:apply
   ```
   
   Output:
   ```
   ✅ Generated MU .env (rate limit: 10000 req/60000ms)
   ```

3. **Restart MU to pick up changes**:
   ```bash
   docker compose restart mu
   ```
   
   Or restart all services:
   ```bash
   pnpm stop && pnpm start
   ```

### Remove Rate Limiting (Unlimited)

Remove the `rateLimit` section from your config:

```json
{
  "services": {
    "mu": {
      "enabled": true
      // No rateLimit section = defaults to unlimited
    }
  }
}
```

Then apply:
```bash
pnpm run config:apply
```

This will default to:
- 999,999 requests per second (unlimited)

## Generated File

The `services/mu/.env` file is **auto-generated**. Do not edit it manually - it will be overwritten on the next `config:apply`.

### Example Generated File

```env
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

# Rate limiting configuration
# User configured: 50000 requests per 3600000ms
IP_WALLET_RATE_LIMIT=50000
IP_WALLET_RATE_LIMIT_INTERVAL=3600000
```

## MU Version

**Current MU version**: `fa48943` (September 2025)
- ✅ Has hyperbeam device message handler fixes
- ✅ Has rate limiting (configurable via env vars)

The MU Dockerfile attempts to patch out rate limiting with `sed`, but this doesn't work reliably. Instead, we configure it via environment variables.

## Testing

Run the MU configuration tests:

```bash
pnpm test:mu-config
```

**Tests verify:**
- ✅ Default unlimited rate limit (999999 req/sec)
- ✅ User-configured rate limits are respected
- ✅ All required environment variables are present
- ✅ Config changes are applied on `config:apply`
- ✅ No docker-compose override env vars (uses .env file)
- ✅ Backwards compatibility with configs that don't specify rate limits

## Troubleshooting

### Config not applying?

**Check:**
1. Did you run `pnpm run config:apply`?
2. Did you restart the MU container?
3. Is the `.env` file generated?

```bash
# Check if .env exists and has your config
cat services/mu/.env | grep IP_WALLET_RATE_LIMIT

# Restart MU
docker compose restart mu
```

### Still seeing rate limits?

**Verify the container is using the new config:**

```bash
# Check container env vars
docker compose exec mu env | grep IP_WALLET_RATE_LIMIT
```

If it doesn't match your config:
1. Run `pnpm stop` to fully stop services
2. Run `pnpm start` to restart with new config

## Architecture Notes

### Why .env file instead of docker-compose override?

**Pros of .env approach:**
- ✅ Single source of truth for MU configuration
- ✅ Easy to inspect (`cat services/mu/.env`)
- ✅ Explicit and clear what's being set
- ✅ Standard Docker Compose pattern
- ✅ Can include comments

**Why not docker-compose override?**
- Environment variables in `docker-compose.override.yml` would be redundant
- The `.env` file is cleaner for service-specific config
- Easier to template and generate

### Docker Compose Integration

From `docker-compose.yml`:

```yaml
mu:
  build: ./services/mu
  configs:
    - source: ao-wallet
      target: /usr/app/ao-wallet.json
  env_file: ./services/mu/.env  ← Loads our generated file
  ports:
    - 4002:80
```

The `env_file` directive tells Docker to inject all variables from `services/mu/.env` into the container's environment.

## Related Documentation

- **MU_RATE_LIMIT_FIX.md**: Technical details on the rate limit fix
- **MU_RATE_LIMIT_SUMMARY.md**: Quick summary
- **config.mjs**: Implementation of `generateMuEnv()`
- **tests/mu-config.test.ts**: Comprehensive tests for config management

