# Using ao-localnet with pnpm link

This guide explains how to use the `ao-localnet` package in other projects via `pnpm link` for local development.

## 🔗 What is pnpm link?

`pnpm link` allows you to test your package in other projects without publishing it to npm. Changes you make to the `ao-localnet` codebase are immediately available in linked projects.

## ✅ Already Linked!

This package is already linked globally! You can see it with:

```bash
pnpm list -g | grep ao-localnet
# Output: ao-localnet link:../../../../../../Volumes/primary_all/ao-localnet-archive
```

## 🚀 Using in Other Projects

### 1. Link in Your Project

In your other project directory:

```bash
cd /path/to/your/project
pnpm link ao-localnet
```

You should see:

```
Progress: resolved X, reused X, downloaded X, added X
+ ao-localnet 1.0.0 <- ../../../Volumes/primary_all/ao-localnet-archive
```

### 2. Use It!

Now you can import from `ao-localnet` in your project:

```typescript
// your-project/src/test.ts
import {
  getAoInstance,
  getScheduler,
  getAosModule,
  createAoSigner,
  waitForAllServices,
} from 'ao-localnet';

// Your code here
const ao = getAoInstance();
```

### 3. Development Workflow

When you make changes to `ao-localnet`:

```bash
# In ao-localnet-archive directory
cd /Volumes/primary_all/ao-localnet-archive
pnpm run build        # Rebuild TypeScript
```

Changes are immediately available in your linked project! 🎉

## 📦 Example: E2E Testing Project

```bash
# Create a new project
mkdir my-ao-tests
cd my-ao-tests
pnpm init

# Link ao-localnet
pnpm link ao-localnet

# Install test dependencies
pnpm add -D tsx typescript @types/node

# Create test file
cat > test.ts << 'EOF'
import { test } from 'node:test';
import assert from 'node:assert';
import {
  getAoInstance,
  getScheduler,
  getAosModule,
  createAoSigner,
  waitForAllServices,
} from 'ao-localnet';

test('should spawn process on localnet', async () => {
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
  
  assert.ok(processId);
  console.log('✅ Process spawned:', processId);
});
EOF

# Run test
node --test test.ts
```

## 🔄 Unlinking

### Unlink from a Project

```bash
cd /path/to/your/project
pnpm unlink ao-localnet
```

### Unlink Globally

```bash
cd /Volumes/primary_all/ao-localnet-archive
pnpm unlink --global
```

## 🛠️ Re-linking

If you need to re-link:

```bash
cd /Volumes/primary_all/ao-localnet-archive
pnpm link --global
```

## 📊 Checking Link Status

### Global Links

```bash
pnpm list -g
```

### Project Links

```bash
cd /path/to/your/project
pnpm list --depth 0 | grep ao-localnet
```

## 🎯 Benefits of pnpm link

1. **Instant Updates** - Changes are immediately available
2. **No Publishing** - Test before releasing
3. **Real Environment** - Test in actual use cases
4. **Fast Iteration** - Rebuild and test quickly
5. **Type Safety** - Full TypeScript support

## 🔍 Troubleshooting

### Link not working?

1. Check if globally linked:
   ```bash
   pnpm list -g | grep ao-localnet
   ```

2. Rebuild TypeScript:
   ```bash
   cd /Volumes/primary_all/ao-localnet-archive
   pnpm run build
   ```

3. Re-link in project:
   ```bash
   cd /path/to/your/project
   pnpm unlink ao-localnet
   pnpm link ao-localnet
   ```

### Types not working?

Make sure `dist/` contains `.d.ts` files:

```bash
cd /Volumes/primary_all/ao-localnet-archive
ls -la dist/*.d.ts
```

If not, rebuild:

```bash
pnpm run build
```

### Import errors?

Ensure your project's `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## 💡 Tips

1. **Watch Mode** - Keep TypeScript building automatically:
   ```bash
   cd /Volumes/primary_all/ao-localnet-archive
   pnpm run build:watch
   ```

2. **Multiple Projects** - Link to as many projects as you need:
   ```bash
   cd ~/project1 && pnpm link ao-localnet
   cd ~/project2 && pnpm link ao-localnet
   cd ~/project3 && pnpm link ao-localnet
   ```

3. **Testing** - Always test your changes:
   ```bash
   cd /Volumes/primary_all/ao-localnet-archive
   pnpm test
   ```

## 📚 Related Commands

```bash
# Build
pnpm run build
pnpm run build:watch

# Test
pnpm test
pnpm run test:watch

# Link
pnpm link --global
pnpm unlink --global

# In other projects
pnpm link ao-localnet
pnpm unlink ao-localnet
```

## 🎓 Next Steps

1. Create a test project and link `ao-localnet`
2. Write E2E tests using the SDK
3. Test Docker management functions
4. Report any issues or suggest improvements

---

**Package:** ao-localnet  
**Version:** 1.0.0  
**Manager:** pnpm  
**Status:** ✅ Globally linked

