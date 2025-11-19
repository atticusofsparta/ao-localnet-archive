# ao-localnet

Run a complete [AO Computer](http://ao.computer/) testbed, locally, with Docker Compose.

> [!CAUTION]
> **This is an experimental repo intended for power users.**
>
> Please join the Marshal [Discord server](https://discord.gg/KzSRvefPau) for help and support.

## Quick Start

```shell
# Install as npm package
npm install https://github.com/MichaelBuhler/ao-localnet.git

# Initialize and start
npx ao-localnet configure     # Generate wallets and download AOS module
npx ao-localnet start         # Start Docker containers
npx ao-localnet seed          # Seed localnet with initial data

# Use it
npx ao-localnet spawn "myprocess"  # Spawn an AOS process
npx ao-localnet aos "myprocess"    # Connect to the process

# Manage it
npx ao-localnet stop          # Stop containers (keeps data)
npx ao-localnet reset         # Delete all data
```

## Configuration

Customize your localnet with `.ao-localnet.config.json`:

```shell
npx ao-localnet init          # Create config file
```

### Available Options

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
  },
  "data": {
    "arlocal": "./.ao-localnet/arlocal",
    "cu": "./.ao-localnet/cu",
    "mu": "./.ao-localnet/mu",
    "su": "./.ao-localnet/su"
  },
  "services": {
    "mu": {
      "rateLimit": {
        "maxRequests": 10000,
        "intervalMs": 3600000
      }
    },
    "cu": {
      "supportedModuleFormats": ["wasm32-unknown-emscripten", "..."],
      "limits": {
        "maxMemory": "1073741824",
        "maxCompute": "9000000000000"
      }
    }
  }
}
```

**Key Features:**
- **Ports**: Avoid conflicts with other services
- **Data Paths**: Store data wherever you want (default: `./.ao-localnet/`)
- **CU Limits**: Control memory (1GB default) and compute (9T units default)
- **MU Rate Limits**: Control request rates (10K/hour default)
- **Module Formats**: Configure supported WASM formats

📖 See [CU_LIMITS.md](./CU_LIMITS.md) for detailed CU configuration

## Transaction Hydration

Need transactions from mainnet? Here's how to manually hydrate them:

### Pattern 1: Hydrate a Module

```javascript
// hydrate-module.js
import Arweave from 'arweave';
import fs from 'fs';

const mainnet = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });
const localnet = Arweave.init({ host: 'localhost', port: 4000, protocol: 'http' });
const wallet = JSON.parse(fs.readFileSync('./wallets/ao-wallet.json', 'utf8'));

async function hydrateModule(moduleId) {
  console.log(`Fetching module ${moduleId}...`);
  
  // Fetch from mainnet
  const data = await mainnet.transactions.getData(moduleId, { decode: true });
  const tx = await mainnet.transactions.get(moduleId);
  
  // Create on localnet
  const newTx = await localnet.createTransaction({ data }, wallet);
  tx.tags.forEach(tag => {
    const key = tag.get('name', { decode: true, string: true });
    const value = tag.get('value', { decode: true, string: true });
    newTx.addTag(key, value);
  });
  
  // Track original ID
  newTx.addTag('Original-Module-ID', moduleId);
  
  await localnet.transactions.sign(newTx, wallet);
  await localnet.transactions.post(newTx);
  
  console.log(`✅ Module hydrated: ${newTx.id} (original: ${moduleId})`);
  return newTx.id;
}

// Usage
hydrateModule('YOUR-MODULE-ID-HERE');
```

### Pattern 2: Hydrate Transaction Data

```javascript
async function hydrateTransaction(txId) {
  // Fetch transaction and data
  const tx = await mainnet.transactions.get(txId);
  const data = await fetch(`https://arweave.net/${txId}`).then(r => r.arrayBuffer());
  
  // Create on localnet with same tags
  const newTx = await localnet.createTransaction({ data: Buffer.from(data) }, wallet);
  
  tx.tags.forEach(tag => {
    const key = tag.get('name', { decode: true, string: true });
    const value = tag.get('value', { decode: true, string: true });
    newTx.addTag(key, value);
  });
  
  // Tracking tags
  newTx.addTag('Original-TX-ID', txId);
  newTx.addTag('Hydrated-From', 'https://arweave.net');
  newTx.addTag('Hydrated-At', new Date().toISOString());
  
  await localnet.transactions.sign(newTx, wallet);
  await localnet.transactions.post(newTx);
  
  return newTx.id;
}
```

### Pattern 3: Setup Script with Fixtures

Create a `hydrate-fixtures.js` file:

```javascript
import Arweave from 'arweave';
import fs from 'fs';

const localnet = Arweave.init({ host: 'localhost', port: 4000, protocol: 'http' });
const wallet = JSON.parse(fs.readFileSync('./wallets/ao-wallet.json', 'utf8'));

// Your fixture data
const FIXTURES = {
  modules: {
    'aos-2.0': 'YOUR-AOS-MODULE-ID',
    'custom-module': 'YOUR-CUSTOM-MODULE-ID'
  },
  data: {
    'config': './fixtures/config.json',
    'schema': './fixtures/schema.json'
  }
};

async function deployFixtures() {
  const deployed = {};
  
  // Deploy local fixture files
  for (const [name, path] of Object.entries(FIXTURES.data)) {
    console.log(`Deploying ${name}...`);
    const data = fs.readFileSync(path);
    const tx = await localnet.createTransaction({ data }, wallet);
    tx.addTag('Content-Type', 'application/json');
    tx.addTag('Fixture-Name', name);
    await localnet.transactions.sign(tx, wallet);
    await localnet.transactions.post(tx);
    deployed[name] = tx.id;
    console.log(`✅ ${name}: ${tx.id}`);
  }
  
  // Save deployment info
  fs.writeFileSync(
    './deployed-fixtures.json',
    JSON.stringify(deployed, null, 2)
  );
  
  console.log('✅ All fixtures deployed!');
  return deployed;
}

deployFixtures();
```

### Pattern 4: Mint Tokens for Testing

```javascript
async function mintTokens(address, amount = '1000000000000') {
  console.log(`Minting ${amount} tokens for ${address}...`);
  
  const tx = await localnet.createTransaction({
    target: address,
    quantity: amount
  }, wallet);
  
  await localnet.transactions.sign(tx, wallet);
  await localnet.transactions.post(tx);
  
  // Wait for mining
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const balance = await localnet.wallets.getBalance(address);
  console.log(`✅ Balance: ${balance} winston`);
}
```

### Usage in Your Project

1. Create a `setup/` directory with your hydration scripts
2. Run them after starting localnet:

```shell
npx ao-localnet start
node setup/hydrate-fixtures.js
node setup/mint-tokens.js
npx ao-localnet seed
```

3. Reference the deployed fixtures:

```javascript
const fixtures = JSON.parse(fs.readFileSync('./deployed-fixtures.json'));
const moduleId = fixtures['custom-module'];
```

**Note**: Hydrated transactions get new IDs on localnet. Use tracking tags (`Original-*-ID`) to reference mainnet IDs.

## Testing

The project includes a comprehensive TypeScript test suite:

```bash
# Make sure localnet is running
npx ao-localnet start
npx ao-localnet seed

# Run tests
npm test

# Run specific suites
npm run test:module    # Module deployment
npm run test:spawn     # Process spawning
npm run test:message   # Message sending
npm run test:config    # Configuration
```

📖 See [tests/README.md](./tests/README.md) for details

## Services

When running, you'll have these services available:

| Service | Port | Description |
|---------|------|-------------|
| ArLocal | 4000 | Local Arweave gateway |
| MU | 4002 | Messenger Unit |
| SU | 4003 | Scheduler Unit |
| CU | 4004 | Compute Unit |
| ScAR | 4006 | Block explorer (web UI) |
| Bundler | 4007 | Transaction bundler |
| Lunar | 4008 | Additional services |

**Access the block explorer**: http://localhost:4006

## Advanced Usage

### Custom Module Development

```shell
# 1. Build your custom module
cd my-custom-module
npm run build  # Produces module.wasm

# 2. Deploy to localnet
node deploy-to-localnet.js

# 3. Spawn process with your module
npx ao-localnet spawn "test-process" --module YOUR-MODULE-ID
```

### Running from Source

```shell
git clone https://github.com/MichaelBuhler/ao-localnet.git
cd ao-localnet

# Generate wallets
cd wallets && ./generateAll.sh && cd ..

# Start services
docker compose up --detach

# Seed initial data
cd seed
./download-aos-module.sh
./seed-for-aos.sh
cd ..

# Connect to aos
./aos.sh
```

## Use Cases

This localnet is helpful for:

1. **AO Development** - Build and test AO components without mainnet
2. **Module Testing** - Test custom WASM modules locally
3. **Lua Development** - Develop AOS processes without bricking testnet
4. **Integration Testing** - Test full AO workflows end-to-end
5. **Protocol Research** - Experiment with AO protocol modifications

## Architecture

Built on Docker Compose with:
- **ArLocal** - Forked from [textury/arlocal](https://github.com/textury/arlocal)
- **AO Services** - From [@permaweb/ao](https://github.com/permaweb/ao)
- **ScAR Explorer** - From [MichaelBuhler/scar](https://github.com/MichaelBuhler/scar)
- **Native ARM64** - Optimized for Apple Silicon

## Documentation

- [CU_LIMITS.md](./CU_LIMITS.md) - CU resource configuration
- [PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md) - Complete feature list
- [tests/README.md](./tests/README.md) - Test suite documentation

## Support

Join the Marshal [Discord server](https://discord.gg/KzSRvefPau) for help and support.

## License

See individual component licenses in their respective repositories.
