# AO Localnet Configuration Guide

AO Localnet can be configured using a `.ao-localnet.config.json` file in your project directory. This allows you to customize ports, data locations, wallet paths, and more.

## Quick Start

### 1. Initialize Configuration

Create a config file in your project:

```bash
npm run config:init
```

This creates `.ao-localnet.config.json` with default settings.

### 2. Customize Your Config

Edit `.ao-localnet.config.json` to match your needs. See [Configuration Options](#configuration-options) below.

### 3. Apply Configuration

```bash
npm run config:apply
```

This generates `docker-compose.override.yml` based on your config.

### 4. Start Localnet

```bash
npm run start
```

The start command automatically applies config before starting services.

---

## Configuration Options

### Full Example

```json
{
  "version": "1.0",
  "description": "AO Localnet Configuration",
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
    "suDatabase": "su-database-volume",
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
  },
  "services": {
    "arlocal": {
      "enabled": true,
      "persist": true
    },
    "mu": {
      "enabled": true
    },
    "su": {
      "enabled": true,
      "database": {
        "user": "su_user",
        "password": "su_pass",
        "database": "su_db"
      }
    },
    "cu": {
      "enabled": true
    },
    "scar": {
      "enabled": true
    },
    "bundler": {
      "enabled": true
    },
    "lunar": {
      "enabled": true
    }
  },
  "urls": {
    "gateway": "http://localhost:4000",
    "graphql": "http://localhost:4000/graphql",
    "mu": "http://localhost:4002",
    "su": "http://localhost:4003",
    "cu": "http://localhost:4004",
    "bundler": "http://localhost:4007"
  }
}
```

---

## Section Breakdown

### `aos`

Controls AOS module configuration.

```json
{
  "aos": {
    "module": "https://get_ao.g8way.io"
  }
}
```

- **`module`**: URL or path to the AOS module

---

### `wallets`

Configure wallet locations for services.

```json
{
  "wallets": {
    "directory": "./wallets",
    "aoWallet": "./wallets/ao-wallet.json",
    "bundlerWallet": "./wallets/bundler-wallet.json"
  }
}
```

- **`directory`**: Base directory for wallet files
- **`aoWallet`**: Path to the main AO wallet (used by SU, MU, CU)
- **`bundlerWallet`**: Path to the bundler wallet

**Note**: The config system automatically creates these directories if they don't exist.

---

### `data`

Configure persistent data storage locations for each service.

```json
{
  "data": {
    "arlocal": "./services/arlocal/data",
    "cu": "./services/cu/data",
    "mu": "./services/mu/data",
    "su": "./services/su/data",
    "suDatabase": "su-database-volume",
    "bundler": "./services/bundler/data"
  }
}
```

- **`arlocal`**: ArLocal blockchain data (bind mount)
- **`cu`**: Compute Unit data (bind mount)
- **`mu`**: Messenger Unit data (bind mount)
- **`su`**: Scheduler Unit data (bind mount)
- **`suDatabase`**: PostgreSQL volume name (Docker volume)
- **`bundler`**: Bundler data (bind mount)

**Bind Mounts vs Volumes**:
- Most services use **bind mounts** (local directories) for easy access
- SU database uses a **Docker volume** for better performance

**Directory Creation**: All bind mount directories are automatically created when you run `npm run config:apply`.

---

### `ports`

Configure which host ports map to each service.

```json
{
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

Change these if you have port conflicts with other services.

---

### `services`

Enable/disable services and configure service-specific options.

```json
{
  "services": {
    "arlocal": {
      "enabled": true,
      "persist": true
    },
    "su": {
      "enabled": true,
      "database": {
        "user": "su_user",
        "password": "su_pass",
        "database": "su_db"
      }
    }
  }
}
```

- **`enabled`**: Set to `false` to disable a service
- **`su.database`**: PostgreSQL credentials for the Scheduler Unit

---

### `urls`

Configure internal service URLs. These are used by services to communicate with each other.

```json
{
  "urls": {
    "gateway": "http://localhost:4000",
    "graphql": "http://localhost:4000/graphql",
    "mu": "http://localhost:4002",
    "su": "http://localhost:4003",
    "cu": "http://localhost:4004",
    "bundler": "http://localhost:4007"
  }
}
```

**Important**: These should match your `ports` configuration. If you change ports, update these URLs accordingly.

---

## Common Use Cases

### Use Case 1: Change Port Numbers

If port 4000 conflicts with another service:

```json
{
  "ports": {
    "arlocal": 5000
  },
  "urls": {
    "gateway": "http://localhost:5000",
    "graphql": "http://localhost:5000/graphql"
  }
}
```

### Use Case 2: Custom Data Location

Store all data in a project-specific directory:

```json
{
  "data": {
    "arlocal": "./data/arlocal",
    "cu": "./data/cu",
    "mu": "./data/mu",
    "su": "./data/su",
    "bundler": "./data/bundler"
  }
}
```

### Use Case 3: Project-Specific Wallets

Use project-specific wallet files:

```json
{
  "wallets": {
    "directory": "./my-project-wallets",
    "aoWallet": "./my-project-wallets/project-ao.json",
    "bundlerWallet": "./my-project-wallets/project-bundler.json"
  }
}
```

### Use Case 4: Disable Unnecessary Services

If you don't need the web UI or block explorer:

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

---

## Commands

### View Current Configuration

```bash
npm run config:show
```

Shows the active configuration (merged with defaults).

### Reinitialize Config

To reset to defaults (careful, this overwrites!):

```bash
rm .ao-localnet.config.json
npm run config:init
```

### Apply Without Starting

To generate docker-compose.override.yml without starting services:

```bash
npm run config:apply
```

---

## How It Works

1. **Config File**: `.ao-localnet.config.json` contains your settings
2. **Config Script**: `config.mjs` reads the config and generates `docker-compose.override.yml`
3. **Docker Compose**: Uses both `docker-compose.yml` (base) and `docker-compose.override.yml` (your customizations)
4. **Automatic Application**: The `start` script automatically runs `config:apply`

---

## Troubleshooting

### Config not applying?

Make sure to run:
```bash
npm run config:apply
```

Or restart services:
```bash
npm run stop
npm run start
```

### Port already in use?

Change the port in your config:
```json
{
  "ports": {
    "arlocal": 5000
  }
}
```

### Data not persisting?

Check that:
1. Data paths in config exist or can be created
2. Docker has permission to access those directories
3. `docker-compose.override.yml` was generated correctly

### Want to see generated override?

```bash
cat docker-compose.override.yml
```

---

## Best Practices

1. **Version Control**: 
   - ✅ **DO** commit `.ao-localnet.config.json` to your project repo
   - ❌ **DON'T** commit `docker-compose.override.yml` (it's generated)
   - ❌ **DON'T** commit wallet files or data directories

2. **Project-Specific Configs**:
   - Each project should have its own `.ao-localnet.config.json`
   - Use separate data directories per project to avoid conflicts

3. **Port Management**:
   - Keep ports consistent within a config
   - Update both `ports` and `urls` when changing ports

4. **.gitignore**:
   ```gitignore
   docker-compose.override.yml
   wallets/
   services/*/data/
   .env
   ```

---

## Advanced: Multiple Environments

You can create multiple config files for different environments:

```bash
# Development
cp .ao-localnet.config.json .ao-localnet.config.dev.json

# Production
cp .ao-localnet.config.json .ao-localnet.config.prod.json
```

Then swap them as needed:
```bash
cp .ao-localnet.config.dev.json .ao-localnet.config.json
npm run start
```

