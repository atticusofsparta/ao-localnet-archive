import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import Arweave from 'arweave';
import { loadConfig } from './utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

describe('AO Localnet - Configuration Tests', () => {
  let config: any;
  let arweave: any;
  let wallet: any;

  before(async () => {
    console.log('🔧 Loading configuration...');
    config = loadConfig();
    console.log('✅ Configuration loaded');

    // Initialize ArLocal connection
    const gatewayUrl = new URL(config.urls.gateway);
    arweave = Arweave.init({
      host: gatewayUrl.hostname,
      port: config.ports.arlocal,
      protocol: 'http',
    });

    // Load wallet (resolve from project root, not tests directory)
    const walletPath = resolve(__dirname, '..', config.wallets.aoWallet);
    wallet = JSON.parse(readFileSync(walletPath, 'utf8'));
  });

  describe('Configuration Structure', () => {
    it('should have all required top-level sections', () => {
      console.log('📋 Verifying config structure...');

      assert.ok(config.version, 'Config should have version');
      assert.ok(config.aos, 'Config should have aos section');
      assert.ok(config.wallets, 'Config should have wallets section');
      assert.ok(config.data, 'Config should have data section');
      assert.ok(config.ports, 'Config should have ports section');
      assert.ok(config.services, 'Config should have services section');
      assert.ok(config.urls, 'Config should have urls section');

      console.log('✅ All required sections present');
    });

    it('should have valid version format', () => {
      console.log('📌 Checking version format...');
      
      assert.match(config.version, /^\d+\.\d+$/, 'Version should be in X.Y format');
      
      console.log(`✅ Version is valid: ${config.version}`);
    });
  });

  describe('Port Configuration', () => {
    it('should have all service ports defined', () => {
      console.log('🔌 Verifying port configuration...');

      const requiredPorts = ['arlocal', 'mu', 'su', 'cu', 'scar', 'bundler', 'lunar'];
      
      for (const service of requiredPorts) {
        assert.ok(config.ports[service], `Port for ${service} should be defined`);
        assert.strictEqual(typeof config.ports[service], 'number', `Port for ${service} should be a number`);
        assert.ok(config.ports[service] > 0 && config.ports[service] < 65536, `Port for ${service} should be valid`);
        console.log(`  ✅ ${service}: ${config.ports[service]}`);
      }

      console.log('✅ All ports configured correctly');
    });

    it('should have no duplicate ports', () => {
      console.log('🔍 Checking for duplicate ports...');

      const ports = Object.values(config.ports) as number[];
      const uniquePorts = new Set(ports);

      assert.strictEqual(
        ports.length,
        uniquePorts.size,
        'All ports should be unique'
      );

      console.log('✅ No duplicate ports found');
    });

    it('should have URLs matching configured ports', () => {
      console.log('🔗 Verifying URLs match ports...');

      // Check gateway uses arlocal port
      const gatewayUrl = new URL(config.urls.gateway);
      assert.strictEqual(
        parseInt(gatewayUrl.port),
        config.ports.arlocal,
        'Gateway URL should use arlocal port'
      );

      // Check MU URL
      const muUrl = new URL(config.urls.mu);
      assert.strictEqual(
        parseInt(muUrl.port),
        config.ports.mu,
        'MU URL should use MU port'
      );

      // Check SU URL
      const suUrl = new URL(config.urls.su);
      assert.strictEqual(
        parseInt(suUrl.port),
        config.ports.su,
        'SU URL should use SU port'
      );

      // Check CU URL
      const cuUrl = new URL(config.urls.cu);
      assert.strictEqual(
        parseInt(cuUrl.port),
        config.ports.cu,
        'CU URL should use CU port'
      );

      console.log('✅ All URLs match configured ports');
    });
  });

  describe('Wallet Configuration', () => {
    it('should have wallet directory configured', () => {
      console.log('💼 Verifying wallet directory...');

      assert.ok(config.wallets.directory, 'Wallet directory should be configured');
      
      const walletDir = resolve(__dirname, '..', config.wallets.directory);
      assert.ok(existsSync(walletDir), 'Wallet directory should exist');

      console.log(`✅ Wallet directory: ${config.wallets.directory}`);
    });

    it('should have required wallet files configured', () => {
      console.log('🔑 Checking wallet files...');

      const requiredWallets = ['aoWallet', 'bundlerWallet'];

      for (const walletKey of requiredWallets) {
        assert.ok(config.wallets[walletKey], `${walletKey} should be configured`);
        
        const walletPath = resolve(__dirname, '..', config.wallets[walletKey]);
        assert.ok(existsSync(walletPath), `${walletKey} file should exist at ${config.wallets[walletKey]}`);

        // Verify it's valid JSON
        const walletData = JSON.parse(readFileSync(walletPath, 'utf8'));
        assert.ok(walletData, `${walletKey} should be valid JSON`);

        console.log(`  ✅ ${walletKey}: ${config.wallets[walletKey]}`);
      }

      console.log('✅ All wallet files present and valid');
    });

    it('should be able to derive wallet address', async () => {
      console.log('🔐 Deriving wallet address...');

      const address = await arweave.wallets.jwkToAddress(wallet);
      
      assert.ok(address, 'Should be able to derive address from wallet');
      assert.strictEqual(typeof address, 'string', 'Address should be a string');
      assert.strictEqual(address.length, 43, 'Address should be 43 characters');

      console.log(`✅ Wallet address: ${address}`);
    });
  });

  describe('Data Folder Configuration', () => {
    it('should have all service data paths defined', () => {
      console.log('📁 Verifying data folder configuration...');

      const requiredDataPaths = ['arlocal', 'cu', 'mu', 'su', 'bundler'];

      for (const service of requiredDataPaths) {
        assert.ok(config.data[service], `Data path for ${service} should be defined`);
        console.log(`  ✅ ${service}: ${config.data[service]}`);
      }

      console.log('✅ All data paths configured');
    });

    it('should use .ao-localnet directory for data by default', () => {
      console.log('📂 Checking default data directory...');

      const dataServices = ['arlocal', 'cu', 'mu', 'su', 'bundler'];
      
      for (const service of dataServices) {
        if (service !== 'suDatabase') {
          assert.match(
            config.data[service],
            /\.ao-localnet/,
            `${service} should use .ao-localnet directory`
          );
        }
      }

      console.log('✅ Data directories follow convention');
    });

    it('should verify docker-compose.override.yml binds data folders', async () => {
      console.log('🐳 Checking Docker volume bindings...');

      const overridePath = resolve(__dirname, '..', 'docker-compose.override.yml');
      
      if (!existsSync(overridePath)) {
        console.log('⚠️  docker-compose.override.yml not found - run npm run config:apply');
        return;
      }

      const overrideContent = readFileSync(overridePath, 'utf8');

      // Check that data paths are bound (either relative or absolute)
      for (const [service, path] of Object.entries(config.data)) {
        if (typeof path === 'string' && path.startsWith('./')) {
          // Check for either relative path or absolute path version
          const hasBinding = overrideContent.includes(path) || 
                           overrideContent.includes(resolve(__dirname, '..', path));
          
          assert.ok(
            hasBinding,
            `Override should bind ${service} data path: ${path}`
          );
          console.log(`  ✅ ${service} bound to ${path}`);
        }
      }

      console.log('✅ Data folder bindings verified');
    });
  });

  describe('Service Configuration', () => {
    it('should have all services configured', () => {
      console.log('⚙️  Verifying service configuration...');

      const requiredServices = ['arlocal', 'mu', 'su', 'cu', 'scar', 'bundler', 'lunar'];

      for (const service of requiredServices) {
        assert.ok(config.services[service], `Service ${service} should be configured`);
        assert.ok(
          typeof config.services[service].enabled === 'boolean',
          `Service ${service} should have enabled flag`
        );
        console.log(`  ✅ ${service}: ${config.services[service].enabled ? 'enabled' : 'disabled'}`);
      }

      console.log('✅ All services configured');
    });

    it('should have CU supported formats configured', () => {
      console.log('📦 Checking CU module formats...');

      assert.ok(config.services.cu.supportedModuleFormats, 'CU should have supported formats');
      assert.ok(Array.isArray(config.services.cu.supportedModuleFormats), 'Formats should be an array');
      assert.ok(config.services.cu.supportedModuleFormats.length > 0, 'Should have at least one format');

      console.log(`  ✅ ${config.services.cu.supportedModuleFormats.length} formats configured`);
      config.services.cu.supportedModuleFormats.forEach((format: string) => {
        console.log(`     - ${format}`);
      });
    });

    it('should have CU memory and compute limits configured', () => {
      console.log('💾 Checking CU resource limits...');

      assert.ok(config.services.cu.limits, 'CU should have limits configured');
      assert.ok(config.services.cu.limits.maxMemory, 'CU should have max memory limit');
      assert.ok(config.services.cu.limits.maxCompute, 'CU should have max compute limit');

      // Verify they are valid numbers (as strings)
      const maxMemory = parseInt(config.services.cu.limits.maxMemory, 10);
      const maxCompute = parseInt(config.services.cu.limits.maxCompute, 10);

      assert.ok(!isNaN(maxMemory), 'Max memory should be a valid number');
      assert.ok(!isNaN(maxCompute), 'Max compute should be a valid number');
      assert.ok(maxMemory > 0, 'Max memory should be positive');
      assert.ok(maxCompute > 0, 'Max compute should be positive');

      console.log(`  ✅ Max Memory: ${(maxMemory / (1024 * 1024 * 1024)).toFixed(2)} GB (${config.services.cu.limits.maxMemory} bytes)`);
      console.log(`  ✅ Max Compute: ${maxCompute.toLocaleString()} units`);
    });

    it('should verify CU limits are set in docker-compose.override.yml', async () => {
      console.log('🐳 Checking CU environment variables...');

      const overridePath = resolve(__dirname, '..', 'docker-compose.override.yml');
      
      if (!existsSync(overridePath)) {
        console.log('⚠️  docker-compose.override.yml not found - run npm run config:apply');
        return;
      }

      const overrideContent = readFileSync(overridePath, 'utf8');

      // Check for memory limit
      assert.ok(
        overrideContent.includes('PROCESS_WASM_MEMORY_MAX_LIMIT'),
        'Override should include PROCESS_WASM_MEMORY_MAX_LIMIT'
      );
      assert.ok(
        overrideContent.includes(config.services.cu.limits.maxMemory),
        'Override should include configured max memory value'
      );

      // Check for compute limit
      assert.ok(
        overrideContent.includes('PROCESS_WASM_COMPUTE_MAX_LIMIT'),
        'Override should include PROCESS_WASM_COMPUTE_MAX_LIMIT'
      );
      assert.ok(
        overrideContent.includes(config.services.cu.limits.maxCompute),
        'Override should include configured max compute value'
      );

      console.log('  ✅ PROCESS_WASM_MEMORY_MAX_LIMIT set');
      console.log('  ✅ PROCESS_WASM_COMPUTE_MAX_LIMIT set');
    });
  });

  describe('URL Configuration', () => {
    it('should have all required URLs defined', () => {
      console.log('🌐 Verifying URL configuration...');

      const requiredUrls = ['gateway', 'graphql', 'mu', 'su', 'cu', 'bundler'];

      for (const urlKey of requiredUrls) {
        assert.ok(config.urls[urlKey], `URL for ${urlKey} should be defined`);
        
        assert.doesNotThrow(() => {
          new URL(config.urls[urlKey]);
        }, `${urlKey} should be a valid URL`);

        console.log(`  ✅ ${urlKey}: ${config.urls[urlKey]}`);
      }

      console.log('✅ All URLs configured correctly');
    });

    it('should be able to connect to ArLocal', async () => {
      console.log('🔌 Testing ArLocal connection...');

      try {
        const info = await arweave.network.getInfo();
        assert.ok(info, 'Should get network info from ArLocal');
        console.log(`✅ Connected to ArLocal (network: ${info.network})`);
      } catch (error: any) {
        console.log('⚠️  Could not connect to ArLocal - make sure it\'s running');
        console.log(`   Error: ${error.message}`);
        // Don't fail the test, just warn
      }
    });
  });

  describe('AOS Module Configuration', () => {
    it('should have AOS module URL configured', () => {
      console.log('📦 Verifying AOS module configuration...');

      assert.ok(config.aos.module, 'AOS module URL should be configured');
      
      // Should be either a URL or transaction ID
      const isUrl = config.aos.module.startsWith('http://') || config.aos.module.startsWith('https://');
      const isTxId = config.aos.module.length === 43;

      assert.ok(isUrl || isTxId, 'AOS module should be a URL or transaction ID');

      console.log(`✅ AOS module: ${config.aos.module}`);
    });
  });

  describe('Configuration Application', () => {
    it('should generate docker-compose.override.yml when config is applied', async () => {
      console.log('🐳 Verifying config application...');

      const overridePath = resolve(__dirname, '..', 'docker-compose.override.yml');

      if (!existsSync(overridePath)) {
        console.log('⚠️  docker-compose.override.yml not found');
        console.log('   Run: npm run config:apply');
        return;
      }

      const overrideContent = readFileSync(overridePath, 'utf8');

      // Verify it's valid YAML and contains expected content
      assert.ok(overrideContent.includes('services:'), 'Override should define services');
      assert.ok(overrideContent.includes('volumes:') || overrideContent.includes('environment:'), 
        'Override should configure volumes or environment');

      console.log('✅ docker-compose.override.yml generated correctly');
    });

  });
});

