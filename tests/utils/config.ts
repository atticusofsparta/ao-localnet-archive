import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load ao-localnet configuration
 */
export function loadConfig() {
  const configPath = resolve(__dirname, '../../.ao-localnet.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  return config;
}

/**
 * Get localnet URLs from config
 */
export function getLocalnetUrls() {
  const config = loadConfig();
  return {
    gateway: config.urls?.gateway || 'http://localhost:4000',
    graphql: config.urls?.graphql || 'http://localhost:4000/graphql',
    mu: config.urls?.mu || 'http://localhost:4002',
    su: config.urls?.su || 'http://localhost:4003',
    cu: config.urls?.cu || 'http://localhost:4004',
    bundler: config.urls?.bundler || 'http://localhost:4007',
  };
}

/**
 * Get scheduler from config or by loading scheduler-location-publisher wallet
 */
export async function getScheduler() {
  // The scheduler is the ADDRESS of the scheduler-location-publisher wallet
  // Not a transaction ID
  try {
    const Arweave = (await import('arweave')).default;
    const arweave = Arweave.init({});
    
    const schedulerWallet = loadWallet('./wallets/scheduler-location-publisher-wallet.json');
    const schedulerAddress = await arweave.wallets.jwkToAddress(schedulerWallet);
    
    return schedulerAddress;
  } catch (error) {
    // Fallback to config if wallet doesn't exist
    const config = loadConfig();
    return config.bootstrap?.transactions?.scheduler || '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA';
  }
}

/**
 * Load wallet from file
 */
export function loadWallet(walletPath: string) {
  const fullPath = resolve(__dirname, '../../', walletPath);
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

/**
 * Get AO wallet from config
 */
export function getAoWallet() {
  const config = loadConfig();
  const walletPath = config.wallets?.aoWallet || './wallets/ao-wallet.json';
  return loadWallet(walletPath);
}

