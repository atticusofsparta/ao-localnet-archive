/**
 * AO Localnet SDK
 * 
 * Provides pre-configured access to the AO localnet environment,
 * including module IDs, scheduler information, and aoconnect instances.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import Arweave from 'arweave';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuration interface
 */
interface LocalnetConfig {
  version: string;
  description: string;
  aos: {
    module: string;
  };
  wallets: {
    directory: string;
    aoWallet: string;
    bundlerWallet: string;
  };
  data: {
    arlocal: string;
    cu: string;
    mu: string;
    su: string;
    suDatabase: string;
    bundler: string;
  };
  ports: {
    arlocal: number;
    mu: number;
    su: number;
    cu: number;
    scar: number;
    bundler: number;
    lunar: number;
  };
  urls: {
    gateway: string;
    graphql: string;
    mu: string;
    su: string;
    cu: string;
    bundler: string;
  };
  services: Record<string, any>;
  bootstrap?: {
    transactions?: {
      scheduler?: string;
      schedulerLocation?: string;
      aosModule?: string;
      aosModulePublisher?: string;
    };
    wallets?: Record<string, string>;
    lastBootstrap?: string;
  };
}

/**
 * Cached configuration
 */
let cachedConfig: LocalnetConfig | null = null;

/**
 * Load configuration from .ao-localnet.config.json
 */
export function loadConfig(): LocalnetConfig {
  if (cachedConfig) return cachedConfig;
  
  const configPath = resolve(__dirname, '../.ao-localnet.config.json');
  cachedConfig = JSON.parse(readFileSync(configPath, 'utf8'));
  return cachedConfig!;
}

/**
 * Clear the cached configuration (useful for testing)
 */
export function clearConfigCache() {
  cachedConfig = null;
}

/**
 * Get localnet URLs
 */
export function getUrls() {
  const config = loadConfig();
  return config.urls;
}

/**
 * Get scheduler address (the wallet address that published the scheduler location)
 */
export function getScheduler(): string {
  const config = loadConfig();
  if (!config.bootstrap?.transactions?.scheduler) {
    throw new Error(
      'Scheduler not found in config. Please run: npm run seed'
    );
  }
  return config.bootstrap.transactions.scheduler;
}

/**
 * Get scheduler location transaction ID
 */
export function getSchedulerLocation(): string {
  const config = loadConfig();
  if (!config.bootstrap?.transactions?.schedulerLocation) {
    throw new Error(
      'Scheduler location not found in config. Please run: npm run seed'
    );
  }
  return config.bootstrap.transactions.schedulerLocation;
}

/**
 * Get AOS module ID
 */
export function getAosModule(): string {
  const config = loadConfig();
  
  // First check bootstrap config
  if (config.bootstrap?.transactions?.aosModule) {
    return config.bootstrap.transactions.aosModule;
  }
  
  // Fallback to aos.module if configured
  if (config.aos?.module && !config.aos.module.startsWith('http')) {
    return config.aos.module;
  }
  
  throw new Error(
    'AOS module not found in config. Please run: npm run seed'
  );
}

/**
 * Get authority (MU wallet address)
 */
export async function getAuthority(): Promise<string> {
  const config = loadConfig();
  const arweave = Arweave.init({});
  
  const walletPath = config.wallets?.aoWallet || './wallets/ao-wallet.json';
  const fullPath = resolve(__dirname, '..', walletPath);
  const wallet = JSON.parse(readFileSync(fullPath, 'utf8'));
  
  return await arweave.wallets.jwkToAddress(wallet);
}

/**
 * Load a wallet from file
 */
export function loadWallet(walletPath: string) {
  const fullPath = resolve(__dirname, '..', walletPath);
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

/**
 * Get the AO wallet (authority wallet)
 */
export function getAoWallet() {
  const config = loadConfig();
  const walletPath = config.wallets?.aoWallet || './wallets/ao-wallet.json';
  return loadWallet(walletPath);
}

/**
 * Create a data item signer for the AO wallet
 */
export function createAoSigner(): ReturnType<typeof createDataItemSigner> {
  const wallet = getAoWallet();
  return createDataItemSigner(wallet);
}

/**
 * Get a pre-configured aoconnect instance
 */
export function getAoInstance(): ReturnType<typeof connect> {
  const urls = getUrls();
  return connect({
    MU_URL: urls.mu,
    CU_URL: urls.cu,
    GATEWAY_URL: urls.gateway,
  });
}

/**
 * Get all bootstrap information at once
 */
export async function getBootstrapInfo() {
  const config = loadConfig();
  const authority = await getAuthority();
  
  return {
    scheduler: getScheduler(),
    schedulerLocation: getSchedulerLocation(),
    aosModule: getAosModule(),
    authority,
    urls: getUrls(),
    config,
  };
}

/**
 * Export everything for convenience
 */
export default {
  loadConfig,
  clearConfigCache,
  getUrls,
  getScheduler,
  getSchedulerLocation,
  getAosModule,
  getAuthority,
  loadWallet,
  getAoWallet,
  createAoSigner,
  getAoInstance,
  getBootstrapInfo,
};

/**
 * Export Docker management functions
 */
export {
  getDockerClient,
  getContainerName,
  getAllContainerNames,
  findContainer,
  getContainerStatus,
  isServiceRunning,
  isServiceHealthy,
  waitForService,
  waitForAllServices,
  getAllServicesStatus,
  getHealthStatus,
  getContainerLogs,
  execInContainer,
  restartService,
  stopService,
  startService,
  getServiceUrl,
  isServiceAccessible,
  waitForServiceAccessible,
  isServiceReady,
  waitForServiceReady,
  Docker,
} from './docker.js';

export type {
  ServiceName,
  ContainerStatus,
  ServiceHealth,
} from './docker.js';

