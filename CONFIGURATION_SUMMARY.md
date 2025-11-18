# AO Localnet Configuration System - Implementation Summary

## ✅ What Was Built

### Core Files Created

1. **`.ao-localnet.config.json`** - Default configuration file
   - Contains all configurable options with sensible defaults
   - Includes ports, data locations, wallet paths, AOS module settings, and service URLs
   - Uses standard port range 4000-4008

2. **`config.mjs`** - Configuration management script
   - Loads configuration from `.ao-localnet.config.json`
   - Generates `docker-compose.override.yml` dynamically
   - Creates necessary data directories automatically
   - Provides CLI commands: `init`, `apply`, `show`

3. **`CONFIG.md`** - Complete configuration documentation
   - Full reference for all configuration options
   - Usage examples and common use cases
   - Troubleshooting guide
   - Best practices

4. **`.ao-localnet.config.example.json`** - Example custom configuration
   - Demonstrates custom ports (5000 range)
   - Shows project-specific data directories
   - Example of disabled services

### Updated Files

1. **`package.json`** - Added configuration scripts
   ```json
   "config:init": "node config.mjs init",
   "config:apply": "node config.mjs apply",
   "config:show": "node config.mjs show",
   "configure": "npm run config:apply && ...",
   "start": "npm run config:apply && docker compose up --detach"
   ```

2. **`README.md`** - Added configuration section
   - Quick start guide for config system
   - Overview of configurable options
   - Link to detailed CONFIG.md documentation

3. **`.gitignore`** - Added data directory exclusions
   - Excludes generated `docker-compose.override.yml` (already there)
   - Excludes custom data directories (`/data/`, `/test-data/`, `/services/*/data/`)

## 🎯 Features Implemented

### 1. Configurable Ports
- All service ports can be customized
- Prevents conflicts with other running services
- Automatic URL updates to match port changes

**Example:**
```json
{
  "ports": {
    "arlocal": 5000,
    "cu": 5004
  }
}
```

### 2. Persistent Data Locations
- Bind mount paths for each service
- Automatic directory creation
- Project-specific data isolation

**Supported Services:**
- ArLocal (blockchain data)
- CU (Compute Unit)
- MU (Messenger Unit)
- SU (Scheduler Unit)
- Bundler
- SU Database (Docker volume)

**Example:**
```json
{
  "data": {
    "arlocal": "./project-data/arlocal",
    "cu": "./project-data/cu"
  }
}
```

### 3. Wallet Management
- Configurable wallet directory
- Separate paths for AO wallet and bundler wallet
- Automatic wallet directory creation

**Example:**
```json
{
  "wallets": {
    "directory": "./my-wallets",
    "aoWallet": "./my-wallets/ao-wallet.json",
    "bundlerWallet": "./my-wallets/bundler-wallet.json"
  }
}
```

### 4. AOS Module Configuration
- Configurable AOS module source URL
- Ready for custom module integration

**Example:**
```json
{
  "aos": {
    "module": "https://custom-module-source.com/aos.wasm"
  }
}
```

### 5. Service Enable/Disable
- Turn off unnecessary services
- Reduce resource usage
- Faster startup times

**Example:**
```json
{
  "services": {
    "lunar": {
      "enabled": false
    },
    "scar": {
      "enabled": false
    }
  }
}
```

### 6. Service URLs
- Internal communication URLs
- Automatically injected into build arguments
- Used by Lunar and ScAR for proper service discovery

**Example:**
```json
{
  "urls": {
    "gateway": "http://localhost:4000",
    "cu": "http://localhost:4004"
  }
}
```

### 7. Database Configuration
- SU PostgreSQL credentials
- Configurable database name, user, password

**Example:**
```json
{
  "services": {
    "su": {
      "database": {
        "user": "my_user",
        "password": "secure_pass",
        "database": "my_db"
      }
    }
  }
}
```

## 🔄 Workflow Integration

### Automatic Configuration Application
The `start` script now automatically applies configuration:

```bash
npm run start
# Runs: config:apply → docker compose up --detach
```

### Manual Configuration Management
```bash
# Initialize new config
npm run config:init

# View current config
npm run config:show

# Apply config without starting
npm run config:apply

# Start with config
npm run start
```

## 📁 Generated Files

### `docker-compose.override.yml`
Automatically generated from `.ao-localnet.config.json`:
- Port mappings for all services
- Volume bind mounts for data persistence
- Build arguments for URLs
- Environment variables for database

**Important:** This file is:
- ✅ Generated automatically
- ✅ Excluded from git (in `.gitignore`)
- ❌ Should NOT be manually edited (will be overwritten)

## 🧪 Testing Results

### Test 1: Default Configuration
✅ Successfully applied default config
✅ Created data directories: arlocal, cu, mu, su, bundler
✅ Generated valid override file with ports 4000-4008

### Test 2: Custom Configuration
✅ Applied custom config with ports 5000-5008
✅ Created custom data directories in `test-data/`
✅ All directories created automatically
✅ Services bound to correct ports

### Test 3: Configuration Restoration
✅ Successfully restored default config
✅ System returned to standard ports
✅ No data loss or corruption

## 💡 Use Cases Enabled

### 1. Multiple Projects
Each project can have its own isolated localnet:
```bash
# Project A - ports 4000-4008
cd project-a
npm run start

# Project B - ports 5000-5008
cd project-b
npm run start  # Uses custom ports
```

### 2. Port Conflict Resolution
If port 4000 is already in use:
```json
{
  "ports": { "arlocal": 5000 },
  "urls": { "gateway": "http://localhost:5000" }
}
```

### 3. Development vs Production
Different configs for different environments:
- `.ao-localnet.config.dev.json` - Development settings
- `.ao-localnet.config.prod.json` - Production settings

### 4. Custom AOS Modules
Point to your custom-built AOS modules:
```json
{
  "aos": {
    "module": "file:///path/to/my/custom-aos.wasm"
  }
}
```

## 📝 Best Practices

1. **Version Control**
   - ✅ Commit `.ao-localnet.config.json`
   - ❌ Don't commit `docker-compose.override.yml`
   - ❌ Don't commit data directories
   - ❌ Don't commit wallet files

2. **Project Organization**
   - Keep config in project root
   - Use project-specific data directories
   - Document custom configurations in project README

3. **Configuration Updates**
   - Always run `npm run config:apply` after editing config
   - Or run `npm run stop && npm run start` to restart with new config

## 🔧 Architecture

### Configuration Flow
```
.ao-localnet.config.json
         ↓
    config.mjs (apply)
         ↓
docker-compose.override.yml
         ↓
    Docker Compose
         ↓
   Running Services
```

### File Relationships
```
docker-compose.yml          (base configuration)
    +
docker-compose.override.yml (generated from config)
    =
Final Docker Compose        (merged configuration)
```

## 🎓 Learning Resources

- **Quick Start**: See `README.md` Configuration section
- **Full Reference**: See `CONFIG.md` for complete documentation
- **Examples**: See `.ao-localnet.config.example.json` for custom config

## 🚀 Future Enhancements (Ideas)

- [ ] Config validation schema
- [ ] Multiple named configs (profiles)
- [ ] Config migration tool for version updates
- [ ] GUI/web interface for config management
- [ ] Environment variable overrides
- [ ] Config templates for common scenarios
- [ ] Integration with CI/CD pipelines

## ✅ Summary

The AO Localnet configuration system provides:
- **Flexibility**: Customize any aspect of the localnet
- **Isolation**: Run multiple instances simultaneously
- **Simplicity**: Easy JSON configuration
- **Automation**: Auto-applies on start
- **Documentation**: Comprehensive guides
- **Testing**: Thoroughly tested and working

Perfect for:
- Multiple project workflows
- Custom development environments
- Team collaboration with different setups
- CI/CD integration
- Production-like local testing

