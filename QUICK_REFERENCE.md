# AO Localnet - Quick Reference

## 📦 Package Manager: pnpm

This project uses **pnpm** instead of npm for better performance and disk space efficiency.

## 🔗 Global Link

✅ **Already linked!** This package is globally linked and ready to use in other projects.

```bash
# Verify link
pnpm list -g | grep ao-localnet
# Output: ao-localnet link:../../../../../../Volumes/primary_all/ao-localnet-archive
```

## ⚡ Common Commands

### Setup & Configuration

```bash
pnpm install              # Install dependencies
pnpm run configure        # Generate wallets & download AOS module
pnpm run init             # Create config file
```

### Docker Management

```bash
pnpm start                # Start all services
pnpm stop                 # Stop all services
docker compose ps         # Check service status
```

### Seeding

```bash
pnpm run seed             # Seed localnet (saves bootstrap info)
pnpm run reseed           # Reset and re-seed
pnpm run reset            # Delete all data
```

### Development

```bash
pnpm run build            # Build TypeScript SDK
pnpm run build:watch      # Build in watch mode
```

### Testing

```bash
pnpm test                 # Run all tests
pnpm run test:watch       # Watch mode
pnpm run test:spawn       # Spawn tests
pnpm run test:module      # Module tests
pnpm run test:message     # Message tests
pnpm run test:pingpong    # Ping-pong tests
pnpm run test:config      # Config tests
pnpm run test:ratelimit   # Rate limit tests
```

### Configuration

```bash
pnpm run config:show      # Show current config
pnpm run config:apply     # Apply config changes
```

## 🔗 Using in Other Projects

### Link to Your Project

```bash
cd /path/to/your/project
pnpm link ao-localnet
```

### Import and Use

```typescript
import {
  getAoInstance,
  getScheduler,
  getAosModule,
  createAoSigner,
  waitForAllServices,
  isServiceHealthy,
} from 'ao-localnet';

// Wait for services
await waitForAllServices(90000);

// Use SDK
const ao = getAoInstance();
const signer = createAoSigner();

const processId = await ao.spawn({
  module: getAosModule(),
  scheduler: getScheduler(),
  signer,
  tags: [{ name: 'Name', value: 'Test' }],
});
```

### After Making Changes

```bash
cd /Volumes/primary_all/ao-localnet-archive
pnpm run build    # Changes immediately available in linked projects!
```

## 📊 SDK Features

### Configuration
- `loadConfig()` - Load localnet config
- `getUrls()` - Get service URLs
- `getPorts()` - Get service ports

### Bootstrap Info
- `getScheduler()` - Scheduler wallet address
- `getAosModule()` - AOS module ID
- `getAuthority()` - Authority wallet address
- `getBootstrapInfo()` - All info at once

### AO Connect
- `getAoInstance()` - Pre-configured aoconnect
- `createAoSigner()` - Create signer for AO wallet
- `loadWallet(path)` - Load any wallet

### Docker Management
- `waitForAllServices(timeout)` - Wait for services
- `isServiceHealthy(service)` - Check health
- `getHealthStatus()` - All services status
- `getContainerLogs(service)` - Get logs
- `restartService(service)` - Restart service

## 🚀 Typical Workflow

### 1. First Time Setup

```bash
cd /Volumes/primary_all/ao-localnet-archive
pnpm install
pnpm run configure
pnpm start
pnpm run seed
pnpm run build
```

### 2. Daily Development

```bash
# Start localnet (if not running)
pnpm start

# Make changes to SDK
vim src/index.ts

# Rebuild
pnpm run build

# Test
pnpm test

# Changes are now live in all linked projects!
```

### 3. Working in Other Projects

```bash
# Link once
cd /path/to/your/project
pnpm link ao-localnet

# Write tests
vim test.ts

# Run tests
node --test test.ts
```

## 🎯 Service URLs

After starting with `pnpm start`:

```
Gateway (ArLocal):  http://localhost:4000
MU:                 http://localhost:4002
SU:                 http://localhost:4003
CU:                 http://localhost:4004
Bundler:            http://localhost:4005
```

## 🐳 Docker Commands

```bash
# View logs
docker compose logs -f mu
docker compose logs -f su
docker compose logs -f cu

# Restart a service
docker compose restart mu

# Check status
docker compose ps

# Stop specific service
docker compose stop mu

# Remove everything
docker compose down -v
```

## 📝 Key Files

```
.ao-localnet.config.json  # Main config (auto-updated by seed)
docker-compose.yml        # Base Docker setup
docker-compose.override.yml  # Generated from config
pnpm-lock.yaml           # Dependency lockfile
dist/                    # Built SDK output
  ├── index.js           # Main SDK
  ├── index.d.ts         # TypeScript definitions
  ├── docker.js          # Docker management
  └── docker.d.ts        # Docker types
```

## 📚 Documentation

- `README.md` - Main documentation
- `SDK.md` - SDK API reference
- `PNPM_LINK_GUIDE.md` - Detailed link instructions
- `DOCKER_INTEGRATION.md` - Docker management guide
- `CHANGELOG.md` - All changes made
- `QUICK_REFERENCE.md` - This file

## 💡 Tips

1. **Keep services running** - Start once, use all day
2. **Watch mode** - `pnpm run build:watch` for continuous builds
3. **Check health** - Use Docker functions in your tests
4. **Read logs** - `getContainerLogs('mu')` for debugging
5. **Test first** - `pnpm test` before using in other projects

## 🔍 Troubleshooting

### Services not starting?
```bash
docker compose down
pnpm start
pnpm run seed
```

### Link not working?
```bash
# Re-link
cd /Volumes/primary_all/ao-localnet-archive
pnpm link --global
cd /path/to/your/project
pnpm link ao-localnet
```

### Types not found?
```bash
cd /Volumes/primary_all/ao-localnet-archive
pnpm run build
```

### Tests failing?
```bash
# Make sure services are running and seeded
pnpm start
pnpm run seed
# Wait a moment for services to be healthy
pnpm test
```

## 🎓 Learn More

- See `examples/` directory for working code samples
- Check `tests/` for comprehensive test examples
- Read `SDK.md` for complete API documentation

---

**Version:** 1.0.0  
**Package Manager:** pnpm  
**Status:** ✅ Production Ready  
**Link Status:** ✅ Globally Linked

