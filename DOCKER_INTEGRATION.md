# Docker Integration

## 🐳 Overview

Added comprehensive Docker management capabilities to the AO Localnet SDK using `dockerode`. This enables programmatic control of all localnet containers directly from your code or tests.

## ✨ Features Added

### 1. Docker Management Module (`src/docker.ts`)

A complete TypeScript module providing:

- **Service Status Checking**
  - Check if services are running
  - Check if services are healthy
  - Check if services are accessible via HTTP
  - Comprehensive readiness checks

- **Service Control**
  - Start/stop services
  - Restart services
  - Execute commands in containers
  - Get container logs

- **Health Monitoring**
  - Get health status of all services
  - Wait for services to become healthy
  - Wait for all services to be ready
  - HTTP accessibility checks

### 2. Available Services

All localnet services are accessible:

- `arlocal` - Local Arweave gateway
- `mu` - Messenger Unit
- `su` - Scheduler Unit
- `su-database` - Scheduler Unit database
- `cu` - Compute Unit
- `scar` - SCAR service
- `bundler` - Transaction bundler
- `lunar` - Lunar service

## 📦 Installation

The Docker integration is included with the SDK. Dependencies are already installed:

```json
{
  "dependencies": {
    "dockerode": "^4.0.9",
    "@types/dockerode": "^3.3.47"
  }
}
```

## 🚀 Usage Examples

### Check Service Status

```typescript
import { isServiceHealthy, getHealthStatus } from 'ao-localnet';

// Check if MU is healthy
const muHealthy = await isServiceHealthy('mu');
console.log(`MU healthy: ${muHealthy ? '✅' : '❌'}`);

// Get status of all services
const health = await getHealthStatus();
health.forEach(h => {
  console.log(`${h.service}: ${h.healthy ? '✅' : '❌'} (${h.status})`);
});
```

### Wait for Services

```typescript
import { waitForService, waitForAllServices } from 'ao-localnet';

// Wait for MU to be ready (60 second timeout)
await waitForService('mu', 60000);

// Wait for all services to be ready (90 second timeout)
const allReady = await waitForAllServices(90000);
if (!allReady) {
  throw new Error('Services not ready');
}
```

### Service Management

```typescript
import { 
  restartService, 
  waitForServiceReady, 
  getContainerLogs 
} from 'ao-localnet';

// Restart MU service
await restartService('mu');
await waitForServiceReady('mu');

// Get recent logs
const logs = await getContainerLogs('mu', 50);
console.log(logs);
```

### E2E Test Integration

```typescript
import { before } from 'node:test';
import { 
  waitForAllServices, 
  getHealthStatus,
  getAoInstance,
  createAoSigner,
  getScheduler,
  getAosModule,
} from 'ao-localnet';

describe('My AO Tests', () => {
  let ao, signer, processId;

  before(async () => {
    // Ensure all services are ready
    console.log('⏳ Waiting for services...');
    const ready = await waitForAllServices(90000);
    
    if (!ready) {
      const health = await getHealthStatus();
      console.error('Services not ready:');
      health.forEach(h => {
        if (!h.healthy) {
          console.error(`  ❌ ${h.service}: ${h.status}`);
        }
      });
      throw new Error('Services not ready');
    }
    
    console.log('✅ All services ready!');
    
    // Set up test environment
    ao = getAoInstance();
    signer = createAoSigner();
    
    processId = await ao.spawn({
      module: getAosModule(),
      scheduler: getScheduler(),
      signer,
      tags: [{ name: 'Name', value: 'Test Process' }],
    });
  });

  it('should work with healthy services', async () => {
    // Your test code here
  });
});
```

## 📊 API Reference

### Service Status

#### `isServiceRunning(service: ServiceName): Promise<boolean>`
Check if a service container is running.

#### `isServiceHealthy(service: ServiceName): Promise<boolean>`
Check if a service is healthy (running + health check passing).

#### `isServiceReady(service: ServiceName): Promise<boolean>`
Check if service is fully ready (healthy + HTTP accessible).

#### `getHealthStatus(): Promise<ServiceHealth[]>`
Get health status of all services.

```typescript
interface ServiceHealth {
  service: ServiceName;
  healthy: boolean;
  status: string;
  container?: ContainerStatus;
}
```

#### `getAllServicesStatus(): Promise<Record<ServiceName, ContainerStatus | null>>`
Get detailed status of all services.

```typescript
interface ContainerStatus {
  name: string;
  id: string;
  state: string;
  status: string;
  running: boolean;
  health?: 'healthy' | 'unhealthy' | 'starting' | 'none';
}
```

### Waiting for Services

#### `waitForService(service: ServiceName, timeoutMs?: number): Promise<boolean>`
Wait for a service to be healthy. Default timeout: 60 seconds.

#### `waitForAllServices(timeoutMs?: number): Promise<boolean>`
Wait for all services to be healthy. Default timeout: 90 seconds.

#### `waitForServiceReady(service: ServiceName, timeoutMs?: number): Promise<boolean>`
Wait for service to be fully ready (healthy + accessible). Default timeout: 60 seconds.

### Service Management

#### `restartService(service: ServiceName): Promise<void>`
Restart a service container.

#### `stopService(service: ServiceName, timeoutSec?: number): Promise<void>`
Stop a service container.

#### `startService(service: ServiceName): Promise<void>`
Start a service container.

### Logs & Debugging

#### `getContainerLogs(service: ServiceName, tail?: number): Promise<string>`
Get container logs. Default tail: 100 lines.

#### `execInContainer(service: ServiceName, cmd: string[]): Promise<string>`
Execute a command in a container.

### Utilities

#### `getServiceUrl(service: ServiceName): string`
Get the URL for a service.

#### `isServiceAccessible(service: ServiceName): Promise<boolean>`
Check if service is accessible via HTTP.

#### `getDockerClient(): Docker`
Get the Docker client instance for advanced usage.

#### `findContainer(service: ServiceName): Promise<Docker.ContainerInfo | null>`
Find a container by service name.

## 🎯 Use Cases

### 1. Test Setup/Teardown

```typescript
before(async () => {
  await waitForAllServices(90000);
});

after(async () => {
  // Optional: Clean up or restart services
  await restartService('mu');
});
```

### 2. Resilience Testing

```typescript
it('should handle MU restart', async () => {
  // Restart MU
  await restartService('mu');
  await waitForServiceReady('mu', 60000);
  
  // Verify operations still work
  const messageId = await ao.message({...});
  assert.ok(messageId);
});
```

### 3. Debugging

```typescript
it('should debug service issues', async () => {
  if (!await isServiceHealthy('mu')) {
    const logs = await getContainerLogs('mu', 100);
    console.error('MU logs:', logs);
  }
});
```

### 4. CI/CD Integration

```typescript
// In CI pipeline
const ready = await waitForAllServices(120000);
if (!ready) {
  const health = await getHealthStatus();
  console.error('Health status:', health);
  process.exit(1);
}
```

## 📁 Files Created

```
src/
  └── docker.ts                        # Docker management module (320 lines)

dist/
  ├── docker.js                        # Compiled JavaScript
  ├── docker.d.ts                      # TypeScript definitions
  ├── docker.js.map                    # Source map
  └── docker.d.ts.map                  # Declaration source map

examples/
  ├── docker-management.mjs            # Docker usage example
  └── e2e-with-docker.test.mjs         # E2E test example
```

## 🔄 Updated Files

- `src/index.ts` - Export Docker functions
- `package.json` - Added dockerode dependencies
- `README.md` - Added Docker management section
- `SDK.md` - Added Docker API documentation

## ⚙️ Configuration

No additional configuration required! The Docker management automatically:

- Connects to the local Docker daemon
- Finds containers by the `ao-localnet-archive-*` naming convention
- Uses configuration from `.ao-localnet.config.json` for URLs
- Works with the existing Docker Compose setup

## 🎓 Benefits

1. **No Manual Checking** - Programmatically verify service health
2. **Reliable Tests** - Wait for services before running tests
3. **Better Debugging** - Access logs directly from tests
4. **Resilience Testing** - Test service restarts and failures
5. **CI/CD Ready** - Automate service health verification
6. **Type Safe** - Full TypeScript support
7. **Simple API** - Easy to use, hard to misuse

## 🧪 Testing

Run the Docker management example:

```bash
# Build the SDK
pnpm run build

# Run Docker management example
node examples/docker-management.mjs

# Run E2E test example
node --test examples/e2e-with-docker.test.mjs
```

Expected output:

```
🐳 AO Localnet Docker Management

1️⃣  Checking status of all services...
   ✅ arlocal: running (healthy)
   ✅ mu: running
   ✅ su: running
   ✅ su-database: running (healthy)
   ✅ cu: running
   ✅ scar: running
   ✅ bundler: running
   ✅ lunar: running

2️⃣  Getting health status...
   8/8 services healthy
   ✅ arlocal: Up 2 hours (healthy)
   ✅ mu: Up 2 hours
   ... etc
```

## 🚀 Next Steps

1. **Integrate into your E2E tests** - Add `waitForAllServices()` to test setup
2. **Add resilience tests** - Test service restart scenarios
3. **Monitor in production** - Use health checks for monitoring
4. **Customize timeouts** - Adjust wait times for your environment

## 📚 Additional Resources

- [dockerode Documentation](https://github.com/apocas/dockerode)
- [Docker API Reference](https://docs.docker.com/engine/api/)
- [SDK.md](./SDK.md) - Full SDK documentation
- [examples/](./examples/) - Working code examples

---

**Version:** 1.0.0  
**Date:** November 20, 2024  
**Status:** ✅ Complete and tested

