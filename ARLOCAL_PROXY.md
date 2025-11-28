# Arlocal Proxy - Automatic Transaction Mining

## Overview

The `arlocal-proxy` service is a transparent proxy that sits between all services and the `arlocal` (local Arweave gateway). Its primary purpose is to **automatically mine transactions** after they are submitted, eliminating the need for manual mining in local development.

## The Problem

In a local Arweave environment, transactions submitted to `arlocal` are stored but not automatically included in blocks. This means:

- Transactions remain pending until manually mined
- Services waiting for transaction confirmations will timeout
- Developer workflow is interrupted by needing to manually call `/mine`
- Tests fail because data isn't available immediately

## The Solution

The proxy intercepts all traffic to arlocal:

1. **Forwards requests** to arlocal unchanged
2. **Detects successful transactions** (POST/PUT requests with 2xx responses)
3. **Automatically mines** a block after each transaction
4. **Returns the original response** without delay

```
┌─────────────┐         ┌──────────────────┐         ┌─────────┐
│   Services  │────────▶│  arlocal-proxy   │────────▶│ arlocal │
│ (bundler,   │         │                  │         │         │
│  SU, etc.)  │◀────────│  (auto-mines)    │◀────────│         │
└─────────────┘         └──────────────────┘         └─────────┘
                               │
                               │ After successful POST
                               │
                               ▼
                        GET /mine (automatic)
```

## Architecture Changes

### Before (Manual Mining)

```yaml
services:
  arlocal:
    ports:
      - 4000:80  # Exposed directly
  
  bundler:
    environment:
      - GATEWAY_URL=http://arlocal:80
```

### After (Auto Mining)

```yaml
services:
  arlocal:
    # Internal only - not exposed to host
  
  arlocal-proxy:
    ports:
      - 4000:80  # Proxy exposed instead
    environment:
      - ARLOCAL_URL=http://arlocal:80
  
  bundler:
    environment:
      - GATEWAY_URL=http://arlocal-proxy:80  # Points to proxy
```

## Features

### Transparent Proxying
- All HTTP methods are forwarded unchanged
- Headers, query parameters, and body are preserved
- Response from arlocal is returned as-is

### Intelligent Mining
- **Auto-detects transactions**: Mines after successful POST/PUT requests
- **Prevents infinite loops**: Skips mining for `/mine` endpoint itself
- **Race condition safe**: Queues concurrent mine requests
- **Non-blocking**: Mining happens in background, doesn't delay responses

### Queue Management

The proxy includes a queueing system to prevent race conditions:

```javascript
// Multiple simultaneous transactions
POST /tx -> Mine queued
POST /tx -> Mine queued
POST /tx -> Mine queued

// Sequential execution
Mine 1 -> Complete
Mine 2 -> Complete (consolidates queued)
Mine 3 -> Skipped (already processed)
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ARLOCAL_URL` | `http://arlocal:80` | Internal URL of arlocal service |
| `PORT` | `80` | Port for proxy to listen on |
| `DEBUG` | `arlocal-proxy*` | Debug logging namespace |

### Docker Compose

The proxy is automatically configured in `docker-compose.yml`:

```yaml
arlocal-proxy:
  depends_on:
    arlocal:
      condition: service_healthy
  build: ./services/arlocal-proxy
  environment:
    - ARLOCAL_URL=http://arlocal:80
    - DEBUG=arlocal-proxy*
  ports:
    - 4000:80
```

### Services Configuration

Services that previously connected to `arlocal` now connect to `arlocal-proxy`:

**Bundler:**
```yaml
bundler:
  environment:
    - GATEWAY_URL=http://arlocal-proxy:80
```

**SCAR:**
```yaml
scar:
  build:
    args:
      - ARWEAVE_GATEWAY_URL=http://arlocal-proxy:80
```

**SU, MU, CU:** (via their respective .env files)
```bash
GATEWAY_URL=http://arlocal-proxy:80
```

## Testing

### Manual Test

```bash
# Test the proxy is working
curl http://localhost:4000/info

# Post a transaction (should auto-mine)
curl -X POST http://localhost:4000/tx \
  -H "Content-Type: application/json" \
  -d '{"data":"test"}'

# Verify height increased
curl http://localhost:4000/info | jq .height
```

### Automated Test

```bash
cd services/arlocal-proxy
./test-proxy.sh
```

## Logging

Enable detailed logging to see proxy activity:

```bash
# In docker-compose.yml or .env
DEBUG=arlocal-proxy*
```

Example log output:

```
arlocal-proxy POST /tx -> 200 +5ms
arlocal-proxy Transaction posted successfully, triggering mine... +0ms
arlocal-proxy Mining block: http://arlocal:80/mine +2ms
arlocal-proxy Successfully mined block. New height: 42 +100ms
```

## Development

### Local Development

To run the proxy locally for development:

```bash
cd services/arlocal-proxy
npm install

# Point to local arlocal
DEBUG=arlocal-proxy* \
ARLOCAL_URL=http://localhost:4000 \
PORT=4001 \
node server.mjs
```

### Adding to Existing Setup

If you have an existing ao-localnet setup:

1. **Add proxy service** to `docker-compose.yml`
2. **Update service dependencies** from `arlocal` to `arlocal-proxy`
3. **Update environment variables** to point to proxy
4. **Remove manual mining** from scripts/tests
5. **Rebuild services**: `docker compose build`
6. **Restart**: `docker compose up -d`

## Troubleshooting

### Transactions not being mined

Check proxy logs:
```bash
docker compose logs arlocal-proxy -f
```

Ensure the proxy is receiving requests:
```bash
# Should show proxy, not arlocal
curl http://localhost:4000/info
```

### Mining too slow

The proxy mines sequentially to avoid race conditions. For bulk operations:

```bash
# Post multiple transactions
for i in {1..10}; do
  curl -X POST http://localhost:4000/tx -d "{\"data\":\"tx$i\"}"
done

# Then mine all at once
curl http://localhost:4000/mine/10
```

### Infinite loop detection

If you see "Mining triggered for /mine endpoint", something is wrong. The proxy should never mine after a `/mine` request. Check the path filtering logic.

## Benefits

### For Developers
- ✅ No manual mining required
- ✅ Transactions immediately available
- ✅ Natural development workflow
- ✅ Tests run without mining delays

### For CI/CD
- ✅ Automated testing just works
- ✅ No custom mining scripts
- ✅ Faster test execution
- ✅ More reliable builds

### For Services
- ✅ Transparent operation
- ✅ No code changes needed
- ✅ Standard Arweave SDK works
- ✅ Consistent behavior

## Future Enhancements

Possible improvements:

- **Batching**: Mine multiple transactions in one block
- **Smart delay**: Wait X ms to batch rapid transactions
- **Selective mining**: Only mine for specific paths/tags
- **Mining metrics**: Track mining frequency and performance
- **Health monitoring**: Detect and alert on mining failures

## Related Files

- **Proxy server**: `services/arlocal-proxy/server.mjs`
- **Dockerfile**: `services/arlocal-proxy/Dockerfile`
- **Package**: `services/arlocal-proxy/package.json`
- **Test script**: `services/arlocal-proxy/test-proxy.sh`
- **Docker config**: `docker-compose.yml` and `docker-compose.override.yml`

