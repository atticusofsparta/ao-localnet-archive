# Complete Workflow Example

## Scenario: Setting up ao-localnet for your project

Let's walk through a complete example of setting up a custom ao-localnet configuration for your project.

---

## Step 1: Install ao-localnet

```bash
cd my-awesome-ao-project
npm install https://github.com/MichaelBuhler/ao-localnet.git
```

---

## Step 2: Initialize Configuration

```bash
npx ao-localnet init
```

This creates `.ao-localnet.config.json` with default settings:

```json
{
  "version": "1.0",
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

---

## Step 3: Customize Configuration (Optional)

Edit `.ao-localnet.config.json` for your needs:

```json
{
  "version": "1.0",
  "aos": {
    "module": "https://get_ao.g8way.io"
  },
  "wallets": {
    "directory": "./ao-wallets",
    "aoWallet": "./ao-wallets/main.json",
    "bundlerWallet": "./ao-wallets/bundler.json"
  },
  "data": {
    "arlocal": "./ao-data/blockchain",
    "cu": "./ao-data/compute",
    "mu": "./ao-data/messenger",
    "su": "./ao-data/scheduler",
    "bundler": "./ao-data/bundler"
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
    "scar": { "enabled": false },
    "lunar": { "enabled": false }
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

**What we changed:**
- ✅ Custom wallet directory: `./ao-wallets`
- ✅ Custom data directory: `./ao-data/*`
- ✅ Disabled web UI services (scar, lunar)
- ✅ Kept default ports

---

## Step 4: Configure the Localnet

Generate wallets and download AOS module:

```bash
npx ao-localnet configure
```

This runs:
1. `npm run config:apply` - Generates docker-compose.override.yml
2. `wallets/generateAll.sh` - Creates wallet files
3. `seed/download-aos-module.sh` - Downloads AOS module

Output:
```
✅ Configuration applied successfully!

Ports:
  arlocal: http://localhost:4000
  mu: http://localhost:4002
  su: http://localhost:4003
  cu: http://localhost:4004
  bundler: http://localhost:4007

Created directories:
  ./ao-wallets/
  ./ao-data/blockchain/
  ./ao-data/compute/
  ./ao-data/messenger/
  ./ao-data/scheduler/
  ./ao-data/bundler/
```

---

## Step 5: Start the Localnet

```bash
npx ao-localnet start
```

This:
1. Applies your configuration
2. Builds Docker images (first time only)
3. Starts all enabled services

Output:
```
✅ Configuration applied successfully!
[+] Running 8/8
 ✔ Container ao-localnet-arlocal-1       Started
 ✔ Container ao-localnet-mu-1           Started
 ✔ Container ao-localnet-su-database-1  Started
 ✔ Container ao-localnet-su-1           Started
 ✔ Container ao-localnet-cu-1           Started
 ✔ Container ao-localnet-bundler-1      Started
```

---

## Step 6: Seed Initial Data

```bash
npx ao-localnet seed
```

This seeds:
- AR tokens to wallets
- AOS module to blockchain
- Scheduler location info

---

## Step 7: Spawn and Connect to AOS

```bash
# Spawn a new AOS process
npx ao-localnet spawn myapp

# Connect to it
npx ao-localnet aos myapp
```

You're now in AOS REPL connected to your localnet!

```
aos> "Hello from my localnet!"
Hello from my localnet!
```

---

## Your Project Structure

After setup, your project looks like:

```
my-awesome-ao-project/
├── .ao-localnet.config.json    # Your configuration
├── ao-wallets/                 # Generated wallets
│   ├── main.json
│   └── bundler.json
├── ao-data/                    # Persistent data
│   ├── blockchain/
│   ├── compute/
│   ├── messenger/
│   ├── scheduler/
│   └── bundler/
├── docker-compose.override.yml # Generated (don't commit)
└── node_modules/
    └── ao-localnet/
```

---

## Daily Development Workflow

### Starting Work

```bash
# Start localnet with your config
npx ao-localnet start

# Connect to your process
npx ao-localnet aos myapp
```

### Testing Changes

```bash
# Reset all data
npx ao-localnet reset

# Reseed fresh data
npx ao-localnet reseed

# Spawn new process
npx ao-localnet spawn myapp-test
```

### Ending Work

```bash
# Stop services (data is retained)
npx ao-localnet stop
```

---

## Working with Multiple Projects

### Project A (default ports)

```bash
cd project-a
npx ao-localnet start  # Runs on ports 4000-4008
```

### Project B (custom ports)

Edit `.ao-localnet.config.json`:
```json
{
  "ports": {
    "arlocal": 5000,
    "mu": 5002,
    "su": 5003,
    "cu": 5004,
    "bundler": 5007
  },
  "urls": {
    "gateway": "http://localhost:5000",
    "mu": "http://localhost:5002",
    "cu": "http://localhost:5004",
    "bundler": "http://localhost:5007"
  }
}
```

```bash
cd project-b
npx ao-localnet start  # Runs on ports 5000-5008
```

Both can run simultaneously! 🎉

---

## Viewing Your Configuration

```bash
# See current config
npm run config:show

# Verify generated override
cat docker-compose.override.yml
```

---

## Updating Configuration

```bash
# 1. Edit .ao-localnet.config.json

# 2. Restart services
npx ao-localnet stop
npx ao-localnet start  # Auto-applies new config
```

---

## Backup & Restore

### Backup Your Data

```bash
# Backup everything important
tar -czf ao-backup.tar.gz \
  .ao-localnet.config.json \
  ao-wallets/ \
  ao-data/

# Or just the data
tar -czf ao-data-backup.tar.gz ao-data/
```

### Restore

```bash
# Extract backup
tar -xzf ao-backup.tar.gz

# Restart with restored config
npx ao-localnet start
```

---

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker ps

# Check for port conflicts
lsof -i :4000  # Check if port in use

# View logs
docker compose logs arlocal
docker compose logs su
```

### Config not applying

```bash
# Manually apply config
npm run config:apply

# Verify override was generated
cat docker-compose.override.yml

# Force rebuild
docker compose down
docker compose build --no-cache
npx ao-localnet start
```

### Data not persisting

```bash
# Verify directories exist
ls -la ao-data/

# Check bind mounts in override
grep -A 2 "volumes:" docker-compose.override.yml

# Verify Docker permissions
docker compose exec arlocal ls -la /app/db
```

---

## .gitignore Recommendations

```gitignore
# Generated files (don't commit)
docker-compose.override.yml
docker-compose.override.yaml

# Sensitive data (don't commit)
ao-wallets/*.json
wallets/*.json

# Persistent data (don't commit)
ao-data/
data/
services/*/data/

# Config is OK to commit (no secrets)
.ao-localnet.config.json
```

---

## Advanced: CI/CD Integration

### GitHub Actions Example

```yaml
name: Test with AO Localnet

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install ao-localnet
        run: npm install https://github.com/MichaelBuhler/ao-localnet.git
      
      - name: Configure localnet
        run: |
          npx ao-localnet init
          npx ao-localnet configure
      
      - name: Start localnet
        run: npx ao-localnet start
      
      - name: Seed data
        run: npx ao-localnet seed
      
      - name: Run tests
        run: npm test
      
      - name: Stop localnet
        run: npx ao-localnet stop
```

---

## That's the Complete Workflow! 🎉

Key takeaways:
- ✅ `npx ao-localnet init` - One command to initialize
- ✅ Edit `.ao-localnet.config.json` for customization
- ✅ `npx ao-localnet start` - Auto-applies config
- ✅ Multiple projects can run simultaneously
- ✅ All data is persistent and accessible
- ✅ Easy backup/restore
- ✅ CI/CD ready

Happy building! 🚀

