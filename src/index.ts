/**
 * AO Localnet SDK
 * 
 * Provides pre-configured access to the AO localnet environment,
 * including module IDs, scheduler information, and aoconnect instances.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import Arweave from 'arweave';
import { execSync } from 'child_process';

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
 * Check if scheduler location exists in arlocal
 * @param forceReload - Force reload the config before checking
 * @returns true if the scheduler location transaction exists
 */
export async function verifySchedulerLocation(forceReload = false): Promise<boolean> {
  try {
    if (forceReload) {
      clearConfigCache();
    }
    const config = loadConfig();
    const schedulerLocationTxId = config.bootstrap?.transactions?.schedulerLocation;
    
    if (!schedulerLocationTxId) {
      return false;
    }
    
    const urls = getUrls();
    const response = await fetch(`${urls.gateway}/tx/${schedulerLocationTxId}`);
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Check if AOS module exists in arlocal
 * @param forceReload - Force reload the config before checking
 * @returns true if the AOS module transaction exists
 */
export async function verifyAosModule(forceReload = false): Promise<boolean> {
  try {
    if (forceReload) {
      clearConfigCache();
    }
    const config = loadConfig();
    const aosModuleTxId = config.bootstrap?.transactions?.aosModule;
    
    if (!aosModuleTxId) {
      return false;
    }
    
    const urls = getUrls();
    const response = await fetch(`${urls.gateway}/tx/${aosModuleTxId}`);
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Ensure the localnet is properly seeded
 * Checks if scheduler location and AOS module exist, and seeds if missing
 * 
 * @param options - Options for ensuring seed
 * @param options.force - Force re-seeding even if data exists
 * @param options.onProgress - Callback for progress updates
 * @returns true if seeding was performed, false if already seeded
 */
export async function ensureSeeded(options: {
  force?: boolean;
  onProgress?: (message: string) => void;
} = {}): Promise<boolean> {
  const { force = false, onProgress } = options;
  
  // Check if already seeded (unless force)
  if (!force) {
    const [hasSchedulerLocation, hasAosModule] = await Promise.all([
      verifySchedulerLocation(),
      verifyAosModule(),
    ]);
    
    if (hasSchedulerLocation && hasAosModule) {
      onProgress?.('✅ Localnet already seeded');
      return false;
    }
    
    if (!hasSchedulerLocation) {
      onProgress?.('⚠️  Scheduler location missing - re-seeding required');
    }
    if (!hasAosModule) {
      onProgress?.('⚠️  AOS module missing - re-seeding required');
    }
  }
  
  // Run seed script
  onProgress?.('📦 Seeding localnet...');
  
  try {
    const projectRoot = resolve(__dirname, '..');
    const seedScript = resolve(projectRoot, 'seed/seed-for-aos.sh');
    
    execSync(`bash "${seedScript}"`, {
      cwd: projectRoot,
      stdio: onProgress ? 'inherit' : 'pipe',
    });
    
    onProgress?.('✅ Localnet seeded successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to seed localnet: ${errorMessage}`);
  }
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
 * Get the bundler wallet
 */
export function getBundlerWallet() {
  const config = loadConfig();
  const walletPath = config.wallets?.bundlerWallet || './wallets/bundler-wallet.json';
  return loadWallet(walletPath);
}

/**
 * Get bundler wallet address
 */
export async function getBundlerAddress(): Promise<string> {
  const config = loadConfig();
  const arweave = Arweave.init({});
  
  const walletPath = config.wallets?.bundlerWallet || './wallets/bundler-wallet.json';
  const fullPath = resolve(__dirname, '..', walletPath);
  const wallet = JSON.parse(readFileSync(fullPath, 'utf8'));
  
  return await arweave.wallets.jwkToAddress(wallet);
}

/**
 * Create a data item signer for the bundler wallet
 */
export function createBundlerSigner(): ReturnType<typeof createDataItemSigner> {
  const wallet = getBundlerWallet();
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
  const bundlerAddress = await getBundlerAddress();
  
  return {
    scheduler: getScheduler(),
    schedulerLocation: getSchedulerLocation(),
    aosModule: getAosModule(),
    authority,
    bundlerAddress,
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
  getBundlerWallet,
  getBundlerAddress,
  createBundlerSigner,
  getAoInstance,
  getBootstrapInfo,
  verifySchedulerLocation,
  verifyAosModule,
  ensureSeeded,
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

