# Arlocal Proxy - Quick Start

## What is this?

The **arlocal-proxy** automatically mines blocks after you submit transactions to arlocal. No more manual mining! 🎉

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
│              (or bundler, SU, MU, etc.)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ POST /tx (transaction)
                     ▼
            ┌─────────────────┐
            │ arlocal-proxy   │ ◄── You are here!
            │   Port 4000     │
            └────────┬────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         │ 1. Forward to arlocal │
         ▼                       │
    ┌──────────┐                 │
    │ arlocal  │                 │
    │ (internal)                 │
    └────┬─────┘                 │
         │                       │
         │ 200 OK                │
         └───────────┬───────────┘
                     │
                     │ 2. Auto-mine in background
                     ▼
              GET /mine (automatic!)
                     │
                     │ Block mined
                     ▼
              Return original response
```

## Usage

### As a Developer

Just use arlocal like normal - mining happens automatically!

```javascript
// Post a transaction
const response = await fetch('http://localhost:4000/tx', {
  method: 'POST',
  body: transactionData
})

// That's it! The block is automatically mined.
// No need to call /mine
```

### Test It

```bash
# Automated test
pnpm run test:proxy

# Watch logs
pnpm run logs:proxy

# Manual test
curl -X POST http://localhost:4000/tx -d '{"data":"test"}'
curl http://localhost:4000/info | jq .height  # Height increased!
```

### Configuration

The proxy works out of the box. If you need custom settings:

**Environment Variables:**
- `ARLOCAL_URL` - Where arlocal is (default: `http://arlocal:80`)
- `PORT` - Proxy port (default: `80`)
- `DEBUG` - Logging (default: `arlocal-proxy*`)

**In docker-compose.yml:**
```yaml
arlocal-proxy:
  environment:
    - ARLOCAL_URL=http://arlocal:80
    - DEBUG=arlocal-proxy*
```

## Logging

Enable debug logs to see what's happening:

```bash
# Watch live
docker compose logs arlocal-proxy -f

# You'll see:
# arlocal-proxy POST /tx -> 200
# arlocal-proxy Transaction posted, triggering mine...
# arlocal-proxy Mining block: http://arlocal:80/mine
# arlocal-proxy Successfully mined block. New height: 42
```

## Common Questions

### Q: Does this work with all services?
**A:** Yes! Bundler, SU, MU, CU - all services that post to arlocal benefit from auto-mining.

### Q: What if I want to mine manually?
**A:** You can still call `/mine` directly - it won't cause issues.

### Q: Does this slow down responses?
**A:** No! Mining happens in the background after the response is sent.

### Q: What about concurrent transactions?
**A:** The proxy queues mine requests to prevent race conditions. Safe and efficient!

### Q: How do I disable auto-mining?
**A:** Connect directly to arlocal instead of the proxy. See [MIGRATION_AUTO_MINING.md](../../MIGRATION_AUTO_MINING.md) for rollback.

## Troubleshooting

### Proxy not working?

1. **Check it's running:**
   ```bash
   docker compose ps arlocal-proxy
   ```

2. **View logs:**
   ```bash
   docker compose logs arlocal-proxy
   ```

3. **Test health:**
   ```bash
   curl http://localhost:4000/info
   ```

4. **Verify auto-mining:**
   ```bash
   pnpm run test:proxy
   ```

### Need help?

- Read [ARLOCAL_PROXY.md](../../ARLOCAL_PROXY.md) for full docs
- Check [MIGRATION_AUTO_MINING.md](../../MIGRATION_AUTO_MINING.md) for setup
- Join [Marshal Discord](https://discord.gg/KzSRvefPau)

## Benefits

✅ No manual mining  
✅ Natural workflow  
✅ Faster development  
✅ Simpler tests  
✅ Works transparently  

## Learn More

- **Full Documentation:** [ARLOCAL_PROXY.md](../../ARLOCAL_PROXY.md)
- **Migration Guide:** [MIGRATION_AUTO_MINING.md](../../MIGRATION_AUTO_MINING.md)
- **Implementation Summary:** [AUTOMINING_SUMMARY.md](../../AUTOMINING_SUMMARY.md)
- **Main README:** [README.md](../../README.md)

---

**Happy coding! The blocks mine themselves now.** 🚀

