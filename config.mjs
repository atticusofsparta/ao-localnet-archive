#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load configuration from .ao-localnet.config.json
 * Falls back to defaults if config file doesn't exist
 */
export function loadConfig() {
  const configPath = resolve(process.cwd(), '.ao-localnet.config.json');
  const defaultConfigPath = resolve(__dirname, '.ao-localnet.config.json');
  
  let config;
  
  if (existsSync(configPath)) {
    console.log('Loading config from:', configPath);
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  } else if (existsSync(defaultConfigPath)) {
    console.log('Loading default config from:', defaultConfigPath);
    config = JSON.parse(readFileSync(defaultConfigPath, 'utf8'));
  } else {
    throw new Error('No configuration file found. Run `npm run config:init` to create one.');
  }
  
  return config;
}

/**
 * Generate docker-compose.override.yml from config
 */
export function generateDockerComposeOverride(config) {
  const override = {
    version: '3.8',
    services: {}
  };

  // Add port mappings
  if (config.ports) {
    if (config.services.arlocal?.enabled !== false) {
      override.services.arlocal = {
        ports: [`${config.ports.arlocal}:80`]
      };
    }
    
    if (config.services.mu?.enabled !== false) {
      override.services.mu = {
        ports: [`${config.ports.mu}:80`]
      };
    }
    
    if (config.services.su?.enabled !== false) {
      override.services.su = {
        ports: [`${config.ports.su}:80`]
      };
    }
    
    if (config.services.cu?.enabled !== false) {
      override.services.cu = {
        ports: [`${config.ports.cu}:80`]
      };
    }
    
    if (config.services.scar?.enabled !== false) {
      override.services.scar = {
        ports: [`${config.ports.scar}:80`]
      };
    }
    
    if (config.services.bundler?.enabled !== false) {
      override.services.bundler = {
        ports: [`${config.ports.bundler}:80`]
      };
    }
    
    if (config.services.lunar?.enabled !== false) {
      override.services.lunar = {
        ports: [`${config.ports.lunar}:80`]
      };
    }
  }

  // Add data volume binds
  if (config.data) {
    // ArLocal data
    if (config.data.arlocal && config.services.arlocal?.enabled !== false) {
      override.services.arlocal = override.services.arlocal || {};
      override.services.arlocal.volumes = [
        `${resolve(config.data.arlocal)}:/app/db`
      ];
      
      // Ensure directory exists
      const arLocalDir = resolve(process.cwd(), config.data.arlocal);
      if (!existsSync(arLocalDir)) {
        mkdirSync(arLocalDir, { recursive: true });
        console.log('Created directory:', arLocalDir);
      }
    }

    // CU data
    if (config.data.cu && config.services.cu?.enabled !== false) {
      override.services.cu = override.services.cu || {};
      override.services.cu.volumes = override.services.cu.volumes || [];
      override.services.cu.volumes.push(
        `${resolve(config.data.cu)}:/usr/app/data`
      );
      
      const cuDir = resolve(process.cwd(), config.data.cu);
      if (!existsSync(cuDir)) {
        mkdirSync(cuDir, { recursive: true });
        console.log('Created directory:', cuDir);
      }
    }

    // MU data
    if (config.data.mu && config.services.mu?.enabled !== false) {
      override.services.mu = override.services.mu || {};
      override.services.mu.volumes = override.services.mu.volumes || [];
      override.services.mu.volumes.push(
        `${resolve(config.data.mu)}:/usr/app/data`
      );
      
      const muDir = resolve(process.cwd(), config.data.mu);
      if (!existsSync(muDir)) {
        mkdirSync(muDir, { recursive: true });
        console.log('Created directory:', muDir);
      }
    }

    // SU data
    if (config.data.su && config.services.su?.enabled !== false) {
      override.services.su = override.services.su || {};
      override.services.su.volumes = override.services.su.volumes || [];
      override.services.su.volumes.push(
        `${resolve(config.data.su)}:/app/data`
      );
      
      const suDir = resolve(process.cwd(), config.data.su);
      if (!existsSync(suDir)) {
        mkdirSync(suDir, { recursive: true });
        console.log('Created directory:', suDir);
      }
    }

    // Bundler data
    if (config.data.bundler && config.services.bundler?.enabled !== false) {
      override.services.bundler = override.services.bundler || {};
      override.services.bundler.volumes = override.services.bundler.volumes || [];
      override.services.bundler.volumes.push(
        `${resolve(config.data.bundler)}:/app/data`
      );
      
      const bundlerDir = resolve(process.cwd(), config.data.bundler);
      if (!existsSync(bundlerDir)) {
        mkdirSync(bundlerDir, { recursive: true });
        console.log('Created directory:', bundlerDir);
      }
    }
  }

  // Add wallet paths
  if (config.wallets) {
    const walletDir = resolve(process.cwd(), config.wallets.directory);
    if (!existsSync(walletDir)) {
      mkdirSync(walletDir, { recursive: true });
      console.log('Created directory:', walletDir);
    }
  }

  // Add environment variables for URLs
  if (config.urls) {
    const buildArgs = {
      GATEWAY_URL: config.urls.gateway,
      GRAPHQL_URL: config.urls.graphql,
      MU_URL: config.urls.mu,
      CU_URL: config.urls.cu,
      BUNDLER_URL: config.urls.bundler
    };

    if (config.services.lunar?.enabled !== false) {
      override.services.lunar = override.services.lunar || {};
      override.services.lunar.build = {
        args: buildArgs
      };
    }

    if (config.services.scar?.enabled !== false) {
      override.services.scar = override.services.scar || {};
      override.services.scar.build = {
        args: {
          ARWEAVE_GATEWAY_URL: config.urls.gateway
        }
      };
    }
  }

  // Add SU database environment
  if (config.services.su?.database) {
    override.services['su-database'] = {
      environment: [
        `POSTGRES_USER=${config.services.su.database.user}`,
        `POSTGRES_PASSWORD=${config.services.su.database.password}`,
        `POSTGRES_DB=${config.services.su.database.database}`
      ]
    };
  }

  // MU rate limit configuration
  if (config.services.mu?.rateLimit) {
    override.services.mu = override.services.mu || {};
    override.services.mu.environment = override.services.mu.environment || [];
    override.services.mu.environment.push(
      `IP_WALLET_RATE_LIMIT=${config.services.mu.rateLimit.maxRequests}`,
      `IP_WALLET_RATE_LIMIT_INTERVAL=${config.services.mu.rateLimit.intervalMs}`
    );
  }

  // CU supported module formats
  if (config.services.cu?.supportedModuleFormats) {
    override.services.cu = override.services.cu || {};
    override.services.cu.environment = override.services.cu.environment || [];
    override.services.cu.environment.push(
      `PROCESS_WASM_SUPPORTED_FORMATS=${config.services.cu.supportedModuleFormats.join(',')}`
    );
  }

  // CU memory and compute limits
  if (config.services.cu?.limits) {
    override.services.cu = override.services.cu || {};
    override.services.cu.environment = override.services.cu.environment || [];
    
    if (config.services.cu.limits.maxMemory) {
      override.services.cu.environment.push(
        `PROCESS_WASM_MEMORY_MAX_LIMIT=${config.services.cu.limits.maxMemory}`
      );
    }
    
    if (config.services.cu.limits.maxCompute) {
      override.services.cu.environment.push(
        `PROCESS_WASM_COMPUTE_MAX_LIMIT=${config.services.cu.limits.maxCompute}`
      );
    }
  }

  return override;
}

/**
 * Convert YAML-like object to string
 */
function objectToYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    
    if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach(item => {
        if (typeof item === 'object') {
          yaml += `${spaces}  -\n${objectToYaml(item, indent + 2).replace(/^/gm, '    ')}`;
        } else {
          yaml += `${spaces}  - ${item}\n`;
        }
      });
    } else if (typeof value === 'object') {
      yaml += `${spaces}${key}:\n${objectToYaml(value, indent + 1)}`;
    } else {
      // Quote strings that need it (e.g., version numbers)
      const needsQuotes = typeof value === 'string' && (key === 'version' || /^\d+\.\d+/.test(value));
      const formattedValue = needsQuotes ? `"${value}"` : value;
      yaml += `${spaces}${key}: ${formattedValue}\n`;
    }
  }

  return yaml;
}

/**
 * Save docker-compose override file
 */
export function saveDockerComposeOverride(override) {
  const overridePath = resolve(process.cwd(), 'docker-compose.override.yml');
  const yaml = objectToYaml(override);
  writeFileSync(overridePath, yaml, 'utf8');
  console.log('Generated:', overridePath);
}

/**
 * Initialize config file in current directory
 */
export function initConfig() {
  const configPath = resolve(process.cwd(), '.ao-localnet.config.json');
  const defaultConfigPath = resolve(__dirname, '.ao-localnet.config.json');
  
  if (existsSync(configPath)) {
    console.log('Config file already exists:', configPath);
    return;
  }
  
  const defaultConfig = JSON.parse(readFileSync(defaultConfigPath, 'utf8'));
  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
  console.log('Created config file:', configPath);
}

/**
 * Apply configuration
 */
export function applyConfig() {
  try {
    const config = loadConfig();
    const override = generateDockerComposeOverride(config);
    saveDockerComposeOverride(override);
    console.log('\n✅ Configuration applied successfully!');
    console.log('\nPorts:');
    if (config.ports) {
      Object.entries(config.ports).forEach(([service, port]) => {
        if (config.services[service]?.enabled !== false) {
          console.log(`  ${service}: http://localhost:${port}`);
        }
      });
    }
  } catch (error) {
    console.error('Error applying config:', error.message);
    process.exit(1);
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      initConfig();
      break;
    case 'apply':
      applyConfig();
      break;
    case 'show':
      console.log(JSON.stringify(loadConfig(), null, 2));
      break;
    default:
      console.log(`
AO Localnet Configuration Tool

Usage:
  node config.mjs init    - Create .ao-localnet.config.json in current directory
  node config.mjs apply   - Generate docker-compose.override.yml from config
  node config.mjs show    - Display current configuration

Environment Variables:
  Set custom values in .ao-localnet.config.json
      `);
      break;
  }
}

