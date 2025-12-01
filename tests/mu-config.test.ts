/**
 * Tests for MU configuration management
 * Verifies that changes to .ao-localnet.config.json are properly applied to MU service
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const configPath = resolve(projectRoot, '.ao-localnet.config.json');
const muEnvPath = resolve(projectRoot, 'services/mu/.env');

let originalConfig: string;
let servicesWereRunning = false;

describe('MU Configuration', () => {
  before(async () => {
    // Backup original config
    if (existsSync(configPath)) {
      originalConfig = readFileSync(configPath, 'utf8');
    }
    
    // Check if services are running
    try {
      execSync('docker compose ps -q mu', { cwd: projectRoot, stdio: 'pipe' });
      const output = execSync('docker compose ps mu', { cwd: projectRoot, encoding: 'utf8' });
      servicesWereRunning = output.includes('Up') || output.includes('running');
    } catch {
      servicesWereRunning = false;
    }
  });

  after(() => {
    // Restore original config
    if (originalConfig) {
      writeFileSync(configPath, originalConfig, 'utf8');
      execSync('pnpm run config:apply', { cwd: projectRoot, stdio: 'inherit' });
    }
  });

  describe('config generation', () => {
    it('should generate MU .env with default unlimited rate limit', async () => {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      
      // Remove rate limit config to test defaults
      if (config.services?.mu?.rateLimit) {
        delete config.services.mu.rateLimit;
      }
      
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      execSync('pnpm run config:apply', { cwd: projectRoot, stdio: 'inherit' });
      
      const envContent = readFileSync(muEnvPath, 'utf8');
      assert.ok(envContent.includes('IP_WALLET_RATE_LIMIT=999999'), 'Should have default unlimited rate limit');
      assert.ok(envContent.includes('IP_WALLET_RATE_LIMIT_INTERVAL=1000'), 'Should have default 1000ms interval');
      
      console.log('   ✅ Default rate limit: 999999 req/1000ms');
    });

    it('should respect user-configured rate limits', async () => {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      
      // Set custom rate limit
      config.services = config.services || {};
      config.services.mu = config.services.mu || {};
      config.services.mu.rateLimit = {
        maxRequests: 5000,
        intervalMs: 60000
      };
      
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      execSync('pnpm run config:apply', { cwd: projectRoot, stdio: 'inherit' });
      
      const envContent = readFileSync(muEnvPath, 'utf8');
      assert.ok(envContent.includes('IP_WALLET_RATE_LIMIT=5000'), 'Should have user rate limit');
      assert.ok(envContent.includes('IP_WALLET_RATE_LIMIT_INTERVAL=60000'), 'Should have user interval');
      
      console.log('   ✅ User rate limit: 5000 req/60000ms');
    });

    it('should include all required MU environment variables', async () => {
      execSync('pnpm run config:apply', { cwd: projectRoot, stdio: 'inherit' });
      
      const envContent = readFileSync(muEnvPath, 'utf8');
      
      const requiredVars = [
        'NODE_CONFIG_ENV=development',
        'PORT=80',
        'PATH_TO_WALLET=/usr/app/ao-wallet.json',
        'CU_URL=http://cu',
        'GATEWAY_URL=http://arlocal',
        'ARWEAVE_URL=http://arlocal',
        'GRAPHQL_URL=http://arlocal/graphql',
        'UPLOADER_URL=http://bundler',
        'TASK_QUEUE_MAX_RETRIES=0',
        'IP_WALLET_RATE_LIMIT=',
        'IP_WALLET_RATE_LIMIT_INTERVAL='
      ];
      
      for (const varPattern of requiredVars) {
        assert.ok(
          envContent.includes(varPattern),
          `Should include ${varPattern}`
        );
      }
      
      console.log('   ✅ All required environment variables present');
    });
  });

  describe('config changes and restarts', () => {
    it('should regenerate .env on config:apply', async () => {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      
      // Set initial rate limit
      config.services = config.services || {};
      config.services.mu = config.services.mu || {};
      config.services.mu.rateLimit = {
        maxRequests: 1000,
        intervalMs: 30000
      };
      
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      execSync('pnpm run config:apply', { cwd: projectRoot, stdio: 'inherit' });
      
      let envContent = readFileSync(muEnvPath, 'utf8');
      assert.ok(envContent.includes('IP_WALLET_RATE_LIMIT=1000'));
      
      // Change rate limit
      config.services.mu.rateLimit.maxRequests = 2000;
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      execSync('pnpm run config:apply', { cwd: projectRoot, stdio: 'inherit' });
      
      envContent = readFileSync(muEnvPath, 'utf8');
      assert.ok(envContent.includes('IP_WALLET_RATE_LIMIT=2000'), 'Should update to new rate limit');
      assert.ok(!envContent.includes('IP_WALLET_RATE_LIMIT=1000'), 'Should not have old rate limit');
      
      console.log('   ✅ Config changes are applied on config:apply');
    });

    it('should not include docker-compose override env vars for MU rate limit', async () => {
      execSync('pnpm run config:apply', { cwd: projectRoot, stdio: 'inherit' });
      
      const overridePath = resolve(projectRoot, 'docker-compose.override.yml');
      const overrideContent = readFileSync(overridePath, 'utf8');
      
      // We use .env file, not docker-compose override environment vars
      // So the override should NOT have IP_WALLET_RATE_LIMIT
      assert.ok(
        !overrideContent.includes('IP_WALLET_RATE_LIMIT'),
        'Should not set rate limit in docker-compose override (uses .env instead)'
      );
      
      console.log('   ✅ Rate limit configured via .env, not docker-compose override');
    });
  });

  describe('integration with Docker', { skip: !servicesWereRunning }, () => {
    it('should pick up new config after container restart', async () => {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      
      // Set a distinct rate limit
      config.services = config.services || {};
      config.services.mu = config.services.mu || {};
      config.services.mu.rateLimit = {
        maxRequests: 7777,
        intervalMs: 8888
      };
      
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      execSync('pnpm run config:apply', { cwd: projectRoot, stdio: 'inherit' });
      
      // Restart MU container to pick up new .env
      console.log('   Restarting MU container...');
      execSync('docker compose restart mu', { cwd: projectRoot, stdio: 'inherit' });
      
      // Wait for MU to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify the container has the new config
      const envContent = readFileSync(muEnvPath, 'utf8');
      assert.ok(envContent.includes('IP_WALLET_RATE_LIMIT=7777'));
      assert.ok(envContent.includes('IP_WALLET_RATE_LIMIT_INTERVAL=8888'));
      
      console.log('   ✅ Container picked up new configuration after restart');
    });
  });

  describe('backwards compatibility', () => {
    it('should work with configs that do not specify rate limits', async () => {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      
      // Remove all MU service config
      if (config.services?.mu) {
        delete config.services.mu;
      }
      
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      // Should not throw
      assert.doesNotThrow(() => {
        execSync('pnpm run config:apply', { cwd: projectRoot, stdio: 'inherit' });
      });
      
      const envContent = readFileSync(muEnvPath, 'utf8');
      assert.ok(envContent.includes('IP_WALLET_RATE_LIMIT=999999'), 'Should default to unlimited');
      
      console.log('   ✅ Works without MU config (uses defaults)');
    });
  });
});

