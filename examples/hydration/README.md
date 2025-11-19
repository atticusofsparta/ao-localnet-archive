# Hydration Examples

Scripts and patterns for hydrating transactions from Arweave mainnet to your local ao-localnet.

## Why Hydrate?

When developing with ao-localnet, you often need:
- Production WASM modules from mainnet
- Test data or configurations
- Reference transactions for testing

These scripts help you pull those resources into your local environment.

## Quick Start

```bash
# 1. Make sure localnet is running
npx ao-localnet start

# 2. Hydrate a single module
node examples/hydration/hydrate-module.mjs cbn0KKrBZH7hdNkNokuXLtGryrWM--PjSTBqIzw9Kkk

# 3. Or hydrate multiple fixtures
node examples/hydration/hydrate-fixtures.mjs

# 4. Mint test tokens if needed
node examples/hydration/mint-tokens.mjs YOUR-ADDRESS 1000000000000
```

## Scripts

### `hydrate-module.mjs`

Hydrate a single WASM module from mainnet.

**Usage:**
```bash
node hydrate-module.mjs <module-id>
```

**Example:**
```bash
node hydrate-module.mjs cbn0KKrBZH7hdNkNokuXLtGryrWM--PjSTBqIzw9Kkk
```

**Output:**
```
✅ Module hydrated successfully!

   Original ID: cbn0KKrBZH7hdNkNokuXLtGryrWM--PjSTBqIzw9Kkk
   Localnet ID: abc123...

💡 Use the localnet ID when spawning processes:
   npx ao-localnet spawn "myprocess" --module abc123...
```

### `hydrate-fixtures.mjs`

Batch hydrate multiple transactions and save the mapping.

**Setup:**

Edit the `FIXTURES` object in the script:

```javascript
const FIXTURES = {
  modules: {
    'aos-2.0': 'cbn0KKrBZH7hdNkNokuXLtGryrWM--PjSTBqIzw9Kkk',
    'my-custom-module': 'YOUR-MODULE-ID',
  },
  transactions: {
    'config-data': 'YOUR-TX-ID',
    'schema': 'YOUR-SCHEMA-TX-ID',
  }
};
```

**Usage:**
```bash
node hydrate-fixtures.mjs
```

**Output:**

Creates `hydrated-fixtures.json`:

```json
{
  "modules": {
    "aos-2.0": "abc123...",
    "my-custom-module": "def456..."
  },
  "transactions": {
    "config-data": "ghi789...",
    "schema": "jkl012..."
  },
  "hydrated_at": "2025-11-19T20:00:00.000Z"
}
```

**Use in your code:**

```javascript
import { readFileSync } from 'fs';

const fixtures = JSON.parse(readFileSync('./hydrated-fixtures.json'));
const moduleId = fixtures.modules['aos-2.0'];
const configId = fixtures.transactions['config-data'];
```

### `mint-tokens.mjs`

Mint AR tokens on localnet for testing.

**Usage:**
```bash
node mint-tokens.mjs <address> [amount]
```

**Example:**
```bash
# Mint 1 AR (1000000000000 winston)
node mint-tokens.mjs 1nEDSZp5JilnSpbHIsA4V8YBwQmqnSL3-iQCvBJwAy4

# Mint 10 AR
node mint-tokens.mjs 1nEDSZp5JilnSpbHIsA4V8YBwQmqnSL3-iQCvBJwAy4 10000000000000
```

## Important Notes

### Transaction IDs Change

When you hydrate a transaction, it gets a **new ID** on localnet. This is because:
- Transactions must be signed with a local wallet
- The signature changes, so the ID changes

**Solution:** Use tracking tags to reference original IDs:

```javascript
// Original mainnet ID is preserved in tags
const tx = await arweave.transactions.get(localnetId);
const originalId = tx.tags.find(t => 
  t.get('name', { decode: true, string: true }) === 'Original-ID'
).get('value', { decode: true, string: true });
```

### Wallet Requirements

These scripts use `wallets/ao-wallet.json`. Make sure:
1. The wallet exists: `cd wallets && ./generateAll.sh`
2. The wallet has tokens (run `npx ao-localnet seed`)

### Network Requirements

- Localnet must be running (`npx ao-localnet start`)
- Internet connection needed to fetch from mainnet

## Integration Patterns

### Pattern 1: Setup Script

Create `setup.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Setting up localnet..."

# Start localnet
npx ao-localnet start

# Wait for services
sleep 5

# Seed initial data
npx ao-localnet seed

# Hydrate fixtures
node examples/hydration/hydrate-fixtures.mjs

# Mint tokens for testing
node examples/hydration/mint-tokens.mjs YOUR-TEST-ADDRESS

echo "✅ Setup complete!"
```

### Pattern 2: Pre-commit Hook

Ensure fixtures are always up-to-date:

```bash
# .git/hooks/pre-commit
#!/bin/bash
if [ -f ".ao-localnet.config.json" ]; then
  node examples/hydration/hydrate-fixtures.mjs
  git add hydrated-fixtures.json
fi
```

### Pattern 3: CI/CD Integration

```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npx ao-localnet start
      - run: node examples/hydration/hydrate-fixtures.mjs
      - run: npm test
```

### Pattern 4: Custom Hydration Script

Create your own hydration logic:

```javascript
import Arweave from 'arweave';
import { hydrateModule } from './examples/hydration/lib.mjs';

const REQUIRED_MODULES = [
  'cbn0KKrBZH7hdNkNokuXLtGryrWM--PjSTBqIzw9Kkk',
  'YOUR-CUSTOM-MODULE-ID',
];

async function setupProject() {
  for (const moduleId of REQUIRED_MODULES) {
    const localId = await hydrateModule(moduleId);
    console.log(`Hydrated: ${moduleId} -> ${localId}`);
  }
}

setupProject();
```

## Troubleshooting

### "Failed to fetch"

**Issue:** Can't fetch from mainnet
**Solution:** 
- Check internet connection
- Verify the transaction ID exists on mainnet
- Try with a VPN if behind corporate firewall

### "Transaction not confirmed"

**Issue:** Transaction not appearing on localnet
**Solution:**
- Wait longer (increase timeout)
- Check ArLocal logs: `docker compose logs arlocal`
- Restart localnet: `npx ao-localnet stop && npx ao-localnet start`

### "Cannot read wallet"

**Issue:** Wallet file not found
**Solution:**
```bash
cd wallets
./generateAll.sh
cd ..
```

### "Insufficient funds"

**Issue:** Wallet doesn't have enough tokens
**Solution:**
```bash
npx ao-localnet seed
```

## Example Workflow

Complete example of setting up a project:

```bash
# 1. Clone your project
git clone your-project
cd your-project

# 2. Install ao-localnet
npm install https://github.com/MichaelBuhler/ao-localnet.git

# 3. Start localnet
npx ao-localnet configure
npx ao-localnet start
npx ao-localnet seed

# 4. Hydrate your dependencies
node examples/hydration/hydrate-fixtures.mjs

# 5. Run your tests
npm test

# 6. Develop!
npx ao-localnet aos "myprocess"
```

## Tips

- **Save hydration results** - Commit `hydrated-fixtures.json` to avoid re-hydrating
- **Cache large modules** - Store WASM binaries locally if you hydrate often
- **Version your fixtures** - Use git tags to track which fixtures work with which code version
- **Automate hydration** - Add to your setup scripts for consistent environments

## Further Reading

- [Arweave Transaction Format](https://docs.arweave.org/developers/server/http-api#transaction-format)
- [AO Module Specification](https://ao.arweave.dev/#/concepts/modules)
- [ArLocal Documentation](https://github.com/textury/arlocal)

