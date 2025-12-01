# MU Rate Limit Configuration - Summary

## TL;DR

✅ **Fixed**: MU was configured with wrong environment variables  
✅ **Now using**: Correct variables from MU's `config.js`  
✅ **Result**: 999,999 requests/second (effectively unlimited)

## The Issue

We were setting environment variables that **don't exist** in MU's configuration:
- `DEFAULT_RATE_LIMIT` ❌
- `RATE_LIMIT_PER_MINUTE` ❌  
- `RATE_LIMIT_ENABLED` ❌

## The Fix

Now using the **actual** variables from MU's `src/config.js`:
- `IP_WALLET_RATE_LIMIT=999999` ✅
- `IP_WALLET_RATE_LIMIT_INTERVAL=1000` ✅

## What Changed

### Before (Incorrect)
```env
# These variables don't exist in MU config.js
DEFAULT_RATE_LIMIT={"default":999999,"addresses":{"..."}...}
RATE_LIMIT_PER_MINUTE=999999
RATE_LIMIT_ENABLED=false
DISABLE_RATE_LIMIT=true
```

### After (Correct)
```env
# These ARE the actual variables MU reads
IP_WALLET_RATE_LIMIT=999999
IP_WALLET_RATE_LIMIT_INTERVAL=1000
```

## How to Apply

```bash
# Regenerate MU .env with correct variables
pnpm run config:apply

# Restart services (Docker may need to be restarted first)
pnpm stop && pnpm start
```

## Technical Details

From MU's `servers/mu/src/config.js`:

```javascript
IP_WALLET_RATE_LIMIT: process.env.IP_WALLET_RATE_LIMIT || 2000,
IP_WALLET_RATE_LIMIT_INTERVAL: process.env.IP_WALLET_RATE_LIMIT_INTERVAL || 1000 * 60 * 60,
```

- **Default**: 2,000 requests per hour
- **Our setting**: 999,999 requests per second
- **Effective**: Unlimited for local testing

## Documentation

- **Full details**: See `MU_RATE_LIMIT_FIX.md`
- **Changelog**: See `CHANGELOG.md`

