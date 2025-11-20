# Examples Directory

This directory contains working examples demonstrating the AO Localnet SDK features.

## 📁 Available Examples

### 1. Basic Usage (`basic-usage.mjs`)

**Purpose:** Demonstrates basic SDK usage - spawning a process and sending a message.

**Run:**
```bash
npm run build
node examples/basic-usage.mjs
```

**Features:**
- Loading configuration
- Creating AO instance
- Creating signer
- Spawning a process
- Sending a message

---

### 2. Docker Management (`docker-management.mjs`)

**Purpose:** Shows how to programmatically manage Docker containers.

**Run:**
```bash
npm run build
node examples/docker-management.mjs
```

**Features:**
- Check service status
- Get health status
- Wait for services
- Get container logs
- Service management examples

**Output:**
```
🐳 AO Localnet Docker Management

1️⃣  Checking status of all services...
   ✅ arlocal: running (healthy)
   ✅ mu: running
   ... etc

2️⃣  Getting health status...
   8/8 services healthy
```

---

### 3. E2E Test with Docker (`e2e-with-docker.test.mjs`)

**Purpose:** Complete E2E test example showing Docker integration in tests.

**Run:**
```bash
npm run build
node --test examples/e2e-with-docker.test.mjs
```

**Features:**
- Wait for all services in test setup
- Health status verification
- Process spawning in tests
- Container log retrieval
- Service restart patterns

**Output:**
```
🔧 Setting up E2E test environment...
⏳ Waiting for all services to be ready...
✅ All services ready!

# tests 6
# pass 6
# fail 0
```

---

## 🚀 Quick Start

### Prerequisites

1. Start the localnet:
   ```bash
   npm start
   ```

2. Seed the network:
   ```bash
   npm run seed
   ```

3. Build the SDK:
   ```bash
   npm run build
   ```

### Run All Examples

```bash
# Basic usage
node examples/basic-usage.mjs

# Docker management
node examples/docker-management.mjs

# E2E test
node --test examples/e2e-with-docker.test.mjs
```

## 📚 Related Documentation

- [README.md](../README.md) - Main project documentation
- [SDK.md](../SDK.md) - Complete SDK API reference
- [DOCKER_INTEGRATION.md](../DOCKER_INTEGRATION.md) - Docker management guide

## 💡 Use These Examples

These examples are meant to be:

1. **Reference** - Copy patterns into your own code
2. **Learning** - Understand how the SDK works
3. **Testing** - Verify your localnet setup
4. **Templates** - Starting point for your E2E tests

## 🎯 Next Steps

After running these examples:

1. **Create your own tests** - Use `e2e-with-docker.test.mjs` as a template
2. **Integrate into CI/CD** - Add service health checks to your pipeline
3. **Build your dApp** - Use the SDK for local development
4. **Extend the SDK** - Add custom functions for your use case

---

**Tip:** All examples work with the compiled SDK in `dist/`. Make sure to run `npm run build` after any changes to the SDK source code.

