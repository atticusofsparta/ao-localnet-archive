# Quick Configuration Guide

## What You Asked For ✅

You wanted to configure:
1. ✅ **AOS_MODULE** - Source for AOS module
2. ✅ **Data locations** - Bind mounts for CU, SU, etc.
3. ✅ **Wallet folder location** - Where wallet files are stored
4. ✅ **Ports** - Which ports each service uses

All of this is now available in `.ao-localnet.config.json`!

---

## Quick Start

### 1. See Your Current Config
```bash
npm run config:show
```

### 2. Edit `.ao-localnet.config.json`
```json
{
  "aos": {
    "module": "https://get_ao.g8way.io"
  },
  "wallets": {
    "directory": "./wallets",
    "aoWallet": "./wallets/ao-wallet.json",
    "bundlerWallet": "./wallets/bundler-wallet.json"
  },
  "data": {
    "arlocal": "./services/arlocal/data",
    "cu": "./services/cu/data",
    "mu": "./services/mu/data",
    "su": "./services/su/data",
    "bundler": "./services/bundler/data"
  },
  "ports": {
    "arlocal": 4000,
    "mu": 4002,
    "su": 4003,
    "cu": 4004,
    "scar": 4006,
    "bundler": 4007,
    "lunar": 4008
  }
}
```

### 3. Restart Services
```bash
npm run stop
npm run start  # Automatically applies config
```

---

## Common Customizations

### Change Ports (Port Conflicts)
```json
{
  "ports": {
    "arlocal": 5000,
    "mu": 5002,
    "su": 5003,
    "cu": 5004
  },
  "urls": {
    "gateway": "http://localhost:5000",
    "mu": "http://localhost:5002",
    "cu": "http://localhost:5004"
  }
}
```

### Use Project-Specific Data Directory
```json
{
  "data": {
    "arlocal": "./my-project/data/arlocal",
    "cu": "./my-project/data/cu",
    "mu": "./my-project/data/mu",
    "su": "./my-project/data/su",
    "bundler": "./my-project/data/bundler"
  }
}
```

### Use Custom Wallet Location
```json
{
  "wallets": {
    "directory": "./my-wallets",
    "aoWallet": "./my-wallets/project-ao.json",
    "bundlerWallet": "./my-wallets/project-bundler.json"
  }
}
```

### Use Custom AOS Module
```json
{
  "aos": {
    "module": "https://custom-source.com/aos-module.wasm"
  }
}
```

### Disable Unnecessary Services
```json
{
  "services": {
    "lunar": { "enabled": false },
    "scar": { "enabled": false }
  }
}
```

---

## What Happens When You Apply Config?

1. **Reads** `.ao-localnet.config.json`
2. **Creates** data directories (if they don't exist)
3. **Generates** `docker-compose.override.yml` with:
   - Port mappings
   - Volume bind mounts
   - Environment variables
   - Build arguments
4. **Ready** for `docker compose up`

---

## File Locations After Config

### Created Automatically
- `docker-compose.override.yml` - Generated Docker config
- Data directories specified in config
- Wallet directory (if specified)

### You Manage
- `.ao-localnet.config.json` - Your configuration
- Wallet JSON files
- Custom data directories

### Don't Commit to Git
- `docker-compose.override.yml` (generated)
- `services/*/data/` (data directories)
- `wallets/*.json` (wallet files)

---

## Bind Mounts Explained

### What Are Bind Mounts?
Docker containers normally store data inside the container. Bind mounts let you store data on your host machine instead.

### Why Use Them?
- **Persistence**: Data survives container restarts
- **Access**: Easily view/backup data from host
- **Portability**: Move data between environments

### How They Work in Config
```json
{
  "data": {
    "cu": "./my-data/cu"  // Host path
  }
}
```

Becomes in Docker:
```yaml
volumes:
  - /full/path/to/my-data/cu:/usr/app/data  # host:container
```

The CU service will store data in `./my-data/cu` on your machine.

---

## Complete Example: Project-Specific Setup

For a project called "myao-app":

```json
{
  "aos": {
    "module": "https://get_ao.g8way.io"
  },
  "wallets": {
    "directory": "./myao-app-wallets",
    "aoWallet": "./myao-app-wallets/ao.json",
    "bundlerWallet": "./myao-app-wallets/bundler.json"
  },
  "data": {
    "arlocal": "./myao-app-data/arlocal",
    "cu": "./myao-app-data/cu",
    "mu": "./myao-app-data/mu",
    "su": "./myao-app-data/su",
    "bundler": "./myao-app-data/bundler"
  },
  "ports": {
    "arlocal": 6000,
    "mu": 6002,
    "su": 6003,
    "cu": 6004,
    "scar": 6006,
    "bundler": 6007,
    "lunar": 6008
  },
  "urls": {
    "gateway": "http://localhost:6000",
    "graphql": "http://localhost:6000/graphql",
    "mu": "http://localhost:6002",
    "su": "http://localhost:6003",
    "cu": "http://localhost:6004",
    "bundler": "http://localhost:6007"
  },
  "services": {
    "scar": { "enabled": false },
    "lunar": { "enabled": false }
  }
}
```

This gives you:
- ✅ Custom port range (6000-6008)
- ✅ Project-specific data directory
- ✅ Project-specific wallets
- ✅ Disabled web UI services
- ✅ All data isolated from other projects

---

## Troubleshooting

### Config not applying?
```bash
npm run config:apply
docker compose restart
```

### Ports still wrong?
Check both `ports` AND `urls` in config match.

### Data not persisting?
1. Check directory was created
2. Check Docker has permission
3. Verify in `docker-compose.override.yml`

### Want to reset?
```bash
rm .ao-localnet.config.json
npx ao-localnet init
```

---

## Next Steps

- 📖 Read full docs: `CONFIG.md`
- 🔍 View example: `.ao-localnet.config.example.json`
- 📋 See summary: `CONFIGURATION_SUMMARY.md`
- 🚀 Start coding!

---

## Commands Cheat Sheet

```bash
# Initialize new config
npx ao-localnet init
# or: npm run init

# View current config
npm run config:show

# Apply config (generates override)
npm run config:apply

# Start with config
npm run start
# or: npx ao-localnet start

# Stop services
npm run stop
# or: npx ao-localnet stop

# Full restart
npm run stop && npm run start
```

---

## That's It! 🎉

You now have full control over:
- ✅ AOS module source
- ✅ Data locations for all services
- ✅ Wallet locations
- ✅ Port assignments
- ✅ Service URLs
- ✅ Enable/disable services
- ✅ Database configuration

Happy coding! 🚀

