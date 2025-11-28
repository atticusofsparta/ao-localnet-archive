# Migration Guide: Auto-Mining Proxy

This guide helps you upgrade to the new **arlocal-proxy** with automatic transaction mining.

## What Changed

### Before
- Transactions submitted to `arlocal` required manual mining
- Scripts and tests needed to explicitly call `/mine` endpoint
- Services connected directly to `arlocal`

### After
- **arlocal-proxy** automatically mines after every transaction
- No manual mining needed in normal workflow
- Services connect to proxy instead of arlocal directly
- ArLocal is now internal-only (not exposed to host)

## Migration Steps

### 1. Update Docker Configuration

If you have a **custom** `docker-compose.yml` or `docker-compose.override.yml`, ensure:

**Remove direct arlocal exposure:**
```yaml
# OLD - remove this
arlocal:
  ports:
    - 4000:80

# NEW - arlocal is internal only
arlocal:
  # No ports section
```

**Add arlocal-proxy service:**
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
    - 4000:80  # Proxy exposed instead
```

**Update service dependencies:**
```yaml
# OLD
bundler:
  depends_on:
    arlocal:
      condition: service_healthy

# NEW
bundler:
  depends_on:
    arlocal-proxy:
      condition: service_healthy
  environment:
    - GATEWAY_URL=http://arlocal-proxy:80
```

### 2. Update Service Environment Variables

Update `.env` files for services that connect to arlocal:

**services/bundler/.env:**
```bash
# OLD
GATEWAY_URL=http://arlocal:80

# NEW
GATEWAY_URL=http://arlocal-proxy:80
```

**services/mu/.env, services/cu/.env, services/su/.env:**
```bash
# If they have GATEWAY_URL or similar, update to:
GATEWAY_URL=http://arlocal-proxy:80
GRAPHQL_URL=http://arlocal-proxy:80/graphql
```

### 3. Rebuild Services

After updating configuration:

```bash
# Rebuild services that were changed
docker compose build arlocal-proxy bundler scar

# Or rebuild everything
docker compose build
```

### 4. Restart the Network

```bash
# Stop all services
docker compose down

# Start with new configuration
docker compose up -d

# Verify proxy is working
curl http://localhost:4000/info
docker compose logs arlocal-proxy -f
```

### 5. Update Scripts (Optional)

Manual `./mine.mjs` calls in scripts are now **optional** but harmless:

**Before (required):**
```bash
./publish-scheduler-location.mjs
./mine.mjs  # Was required
```

**After (optional):**
```bash
./publish-scheduler-location.mjs
# ./mine.mjs  # Optional - proxy auto-mines
```

You can keep the manual mine calls for:
- Defensive programming
- Batch operations
- Explicit block creation timing

### 6. Update Tests (Optional)

Remove any explicit mining from tests:

**Before:**
```javascript
await ao.message({ /* ... */ })
await fetch('http://localhost:4000/mine')  // Remove this
```

**After:**
```javascript
await ao.message({ /* ... */ })
// Auto-mined by proxy!
```

## Verification

### Test the Proxy

```bash
# Run the test script
cd services/arlocal-proxy
./test-proxy.sh
```

### Monitor Auto-Mining

```bash
# Watch proxy logs
docker compose logs arlocal-proxy -f

# Submit a transaction
curl -X POST http://localhost:4000/tx -d '{"data":"test"}'

# You should see:
# arlocal-proxy POST /tx -> 200
# arlocal-proxy Transaction posted successfully, triggering mine...
# arlocal-proxy Mining block: http://arlocal:80/mine
# arlocal-proxy Successfully mined block. New height: X
```

### Verify Services

```bash
# All services should be healthy
docker compose ps

# Check service logs for errors
docker compose logs bundler
docker compose logs su
docker compose logs mu
```

## Rollback

If you need to rollback to manual mining:

### 1. Expose ArLocal Directly

```yaml
arlocal:
  ports:
    - 4000:80  # Expose again
```

### 2. Update Services

```yaml
bundler:
  environment:
    - GATEWAY_URL=http://arlocal:80  # Back to arlocal
```

### 3. Remove Proxy

```yaml
# Comment out or remove arlocal-proxy service
# arlocal-proxy:
#   ...
```

### 4. Restart

```bash
docker compose down
docker compose up -d
```

## Troubleshooting

### Proxy Not Mining

**Check logs:**
```bash
docker compose logs arlocal-proxy -f
```

**Verify proxy is receiving requests:**
```bash
# Should show arlocal-proxy in output
docker compose ps
curl http://localhost:4000/info
```

**Check arlocal is accessible internally:**
```bash
docker compose exec arlocal-proxy wget -O- http://arlocal:80/info
```

### Services Not Connecting to Proxy

**Verify environment variables:**
```bash
# Check bundler config
docker compose exec bundler env | grep GATEWAY

# Should show: GATEWAY_URL=http://arlocal-proxy:80
```

**Rebuild services if needed:**
```bash
docker compose build bundler
docker compose up -d bundler
```

### Port Conflicts

If port 4000 is already in use:

```bash
# Find what's using it
lsof -i :4000

# Change proxy port in docker-compose.override.yml
arlocal-proxy:
  ports:
    - 4001:80  # Use different port
```

## Benefits After Migration

✅ **No manual mining** - Transactions automatically included in blocks
✅ **Faster development** - Natural workflow without interruptions  
✅ **Simpler tests** - No mining logic needed
✅ **Better CI/CD** - Automated tests just work
✅ **Transparent** - Services don't need code changes

## Questions?

See:
- [ARLOCAL_PROXY.md](./ARLOCAL_PROXY.md) - Full proxy documentation
- [README.md](./README.md) - Main documentation
- Service logs: `docker compose logs <service>`

Join the [Marshal Discord](https://discord.gg/KzSRvefPau) for help!

