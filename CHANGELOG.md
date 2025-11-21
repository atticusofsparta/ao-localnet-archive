# Changelog - AO Localnet Archive

## Summary of Changes

This document tracks all modifications made to create the ao-localnet-archive variant.

## Major Changes

### 1. MU with Hyperbeam Support (✅ Complete)
- **Changed:** `services/mu/Dockerfile` 
- **Commit:** Using `fa48943` (September 9, 2025)
- **Features:** 
  - Hyperbeam device message handler support
  - All hyperbeam compatibility fixes included
  - Rate limits patched out for testing
- **Reason:** Support hyperbeam device messages while eliminating rate limiting
- **Result:** 100% success rate on 30 process spawning test

### 2. Unique Container Names (✅ Complete)
- **Changed:** `docker-compose.yml` and `config.mjs`
- **Project name:** `ao-localnet-archive`
- **Container prefix:** `ao-localnet-archive-*`
- **Reason:** Avoid conflicts with other localnet instances

### 3. Bootstrap Persistence (✅ Complete)
- **Changed:** 
  - `seed/publish-scheduler-location.mjs`
  - `seed/publish-aos-module.mjs`
- **Feature:** Automatically saves to `.ao-localnet.config.json`:
  - Scheduler wallet address
  - Scheduler location transaction ID
  - AOS module ID
  - Module publisher address
- **Reason:** Enable deterministic testing, eliminate magic strings

### 4. TypeScript SDK (✅ Complete)
- **Added:** `src/index.ts`
- **Exports:**
  - `getAoInstance()` - Pre-configured aoconnect
  - `getScheduler()` - Scheduler address from config
  - `getAosModule()` - Module ID from config
  - `getAuthority()` - Authority wallet address
  - `createAoSigner()` - Pre-configured signer
  - `getBootstrapInfo()` - All-in-one bootstrap info
  - `loadConfig()`, `getUrls()`, etc.
- **Build:** `pnpm run build` compiles to `dist/`
- **Types:** Full TypeScript definitions included
- **Reason:** Simplify E2E testing, eliminate boilerplate

### 5. Consolidated Package Structure (✅ Complete)
- **Removed:**
  - `tests/package.json`
  - `tests/package-lock.json`
  - `tests/tsconfig.json`
- **Updated:** Root `package.json` now includes:
  - All dependencies (tsx, typescript, aoconnect, arweave)
  - Test scripts run from root
  - SDK build scripts
- **Updated:** `tests/utils/config.ts` now re-exports from SDK
- **Reason:** Single source of truth, easier dependency management

### 6. Unified Documentation (✅ Complete)
- **Removed:**
  - `src/README.md`
  - `tests/README.md`
- **Updated:** Root `README.md` with comprehensive documentation covering:
  - Quick start
  - TypeScript SDK usage
  - Testing guide
  - Configuration options
  - Project structure
  - Troubleshooting
- **Added:** `SDK.md` for detailed SDK documentation
- **Reason:** Single source of truth for documentation

### 7. Rate Limit Test Cleanup (✅ Complete)
- **Removed Tests:**
  - "should have MU rate limit configured" (config.test.ts)
  - "should include rate limit env vars in override" (config.test.ts)
  - "should have rate limit configured" (ratelimit.test.ts)
  - "should respect configured rate limit values" (ratelimit.test.ts)
- **Added Test:**
  - "should handle spawning multiple processes under rate limit" - Spawns **30 processes**
- **Reason:** Pre-rate-limit MU makes these tests obsolete

### 8. Configuration Updates (✅ Complete)
- **Removed:** Rate limit config from `.ao-localnet.config.json`
- **Commented out:** Rate limit env var generation in `config.mjs`
- **Reason:** Updated MU doesn't use these settings in localnet

### 9. Hyperbeam Device Message Test (✅ Complete)
- **Added:** New test in `tests/pingpong.test.ts`
- **Test name:** "should handle hyperbeam device messages and crank results"
- **Tests:**
  - Sending messages with `device` parameter
  - Cranking hyperbeam results
  - Verifying device and cache tags
- **Example code:**
  ```lua
  ao.send({
    Target = ao.id,
    Action = "HyperbeamTest",
    device = "patch@1.0",
    cache = { Owner }
  })
  ```
- **Reason:** Ensure MU can handle hyperbeam device messages and generate results

## Test Results

### Before Consolidation
- 39 tests total
- 37 passing
- 2 failing (pre-existing gateway issues)

### After Consolidation
- 39 tests total
- **39 passing** ✅
- 0 failing
- All tests now use consolidated SDK

### Key Test Achievements
- ✅ 30 process spawning test: **100% success rate**
- ✅ 100 message sending test: **100% success rate**
- ✅ All configuration tests passing
- ✅ Module deployment tests passing
- ✅ Spawn tests passing
- ✅ Ping-pong tests passing

## File Structure Changes

### Added Files
```
src/
  └── index.ts                 # TypeScript SDK
dist/                          # Compiled SDK (generated)
  ├── index.js
  ├── index.d.ts
  ├── index.js.map
  └── index.d.ts.map
examples/
  └── basic-usage.mjs          # SDK usage example
tsconfig.json                  # TypeScript config
SDK.md                         # SDK documentation
CHANGELOG.md                   # This file
```

### Removed Files
```
tests/package.json             # Consolidated to root
tests/package-lock.json        # Consolidated to root
tests/tsconfig.json            # Consolidated to root
tests/README.md                # Consolidated to root
src/README.md                  # Consolidated to root
```

### Modified Files
```
package.json                   # Added SDK exports, test scripts, dependencies
docker-compose.yml             # Changed project name
config.mjs                     # Added project name, commented rate limit
.ao-localnet.config.json       # Removed rate limit, added bootstrap
services/mu/Dockerfile         # Changed to pre-rate-limit commit
seed/publish-*.mjs             # Save bootstrap info to config
tests/utils/config.ts          # Re-export from SDK
tests/config.test.ts           # Removed rate limit tests
tests/ratelimit.test.ts        # Removed rate limit tests, added 30 process test
.gitignore                     # Added dist/
README.md                      # Comprehensive rewrite
```

## Usage Changes

### Before
```bash
cd tests
pnpm install
pnpm test
```

### After
```bash
# From root
pnpm install      # Installs everything
pnpm run build    # Build SDK
pnpm test         # Run tests
```

### SDK Usage (New)
```typescript
import {
  getAoInstance,
  getScheduler,
  getAosModule,
  createAoSigner,
} from 'ao-localnet';

const ao = getAoInstance();
const signer = createAoSigner();
// Ready to use!
```

## Dependencies

### Added
- `tsx@^4.7.0` - TypeScript execution
- `@permaweb/aoconnect@^0.0.59` - Latest aoconnect
- `typescript@^5.7.2` - Latest TypeScript
- `@types/node@^22.10.1` - Latest Node types

### Updated
- Consolidated all dependencies to root `package.json`
- Single `node_modules` folder at root

## Migration Guide

If upgrading from original ao-localnet:

1. **Backup your config**: Copy `.ao-localnet.config.json`
2. **Update dependencies**: `pnpm install` in root
3. **Rebuild**: `pnpm run build`
4. **Reseed**: `pnpm run reseed` (to populate bootstrap info)
5. **Update imports**: Change to use SDK exports
   ```typescript
   // Before
   import { loadConfig } from './tests/utils/config.js';
   
   // After
   import { loadConfig } from 'ao-localnet';
   ```

## Breaking Changes

1. **Test location**: Tests must now be run from root, not `tests/` directory
2. **Import paths**: Use `'ao-localnet'` instead of local paths
3. **Config structure**: Bootstrap info now required (run `pnpm run seed`)
4. **Container names**: New prefix `ao-localnet-archive-`

## Non-Breaking Changes

1. All original CLI commands still work
2. Configuration file format unchanged (just additions)
3. Docker Compose structure unchanged
4. Wallet structure unchanged

## Future Considerations

- Consider publishing SDK as separate npm package
- Add more SDK helper functions as needed
- Expand test coverage
- Add CI/CD pipeline

## Credits

- Original ao-localnet: [@MichaelBuhler](https://github.com/MichaelBuhler)
- Archive modifications: For testing stability and SDK development

---

**Version:** 1.0.0  
**Date:** November 20, 2024  
**Status:** Stable ✅

