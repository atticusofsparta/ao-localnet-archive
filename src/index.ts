/**
 * AO Localnet SDK
 * 
 * Provides pre-configured access to the AO localnet environment,
 * including module IDs, scheduler information, and aoconnect instances.
 */

import { readFileSync, writeFileSync, realpathSync } from 'fs';
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
 * Detailed seeding status information
 */
export interface SeedingStatus {
  isSeeded: boolean;
  schedulerLocation: {
    exists: boolean;
    txId: string | null;
    accessible: boolean;
    error?: string;
  };
  aosModule: {
    exists: boolean;
    txId: string | null;
    accessible: boolean;
    error?: string;
  };
  walletBalances: {
    scheduler: { address: string; balance: number; sufficient: boolean };
    aosPublisher: { address: string; balance: number; sufficient: boolean };
    bundler: { address: string; balance: number; sufficient: boolean };
    ao: { address: string; balance: number; sufficient: boolean };
  } | null;
  issues: string[];
  lastBootstrap: string | null;
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
 * Get comprehensive seeding status with detailed diagnostics
 * @param verbose - Whether to include verbose output (wallet balances, etc.)
 * @returns Detailed seeding status
 */
export async function getSeedingStatus(verbose = false): Promise<SeedingStatus> {
  const config = loadConfig();
  const urls = getUrls();
  const issues: string[] = [];
  
  // Check scheduler location
  const schedulerLocationTxId = config.bootstrap?.transactions?.schedulerLocation;
  let schedulerLocationAccessible = false;
  let schedulerLocationError: string | undefined;
  
  if (schedulerLocationTxId) {
    try {
      const response = await fetch(`${urls.gateway}/tx/${schedulerLocationTxId}`);
      schedulerLocationAccessible = response.ok;
      if (!response.ok) {
        schedulerLocationError = `HTTP ${response.status}: ${response.statusText}`;
        issues.push(`Scheduler location transaction not accessible (${schedulerLocationError})`);
      }
    } catch (error) {
      schedulerLocationError = error instanceof Error ? error.message : String(error);
      issues.push(`Failed to verify scheduler location: ${schedulerLocationError}`);
    }
  } else {
    issues.push('Scheduler location not configured in bootstrap');
  }
  
  // Check AOS module
  const aosModuleTxId = config.bootstrap?.transactions?.aosModule;
  let aosModuleAccessible = false;
  let aosModuleError: string | undefined;
  
  if (aosModuleTxId) {
    try {
      const response = await fetch(`${urls.gateway}/tx/${aosModuleTxId}`);
      aosModuleAccessible = response.ok;
      if (!response.ok) {
        aosModuleError = `HTTP ${response.status}: ${response.statusText}`;
        issues.push(`AOS module transaction not accessible (${aosModuleError})`);
      }
    } catch (error) {
      aosModuleError = error instanceof Error ? error.message : String(error);
      issues.push(`Failed to verify AOS module: ${aosModuleError}`);
    }
  } else {
    issues.push('AOS module not configured in bootstrap');
  }
  
  // Check wallet balances if verbose
  let walletBalances = null;
  if (verbose) {
    try {
      const arweave = Arweave.init({
        protocol: 'http',
        host: 'localhost',
        port: config.ports.arlocal,
      });
      
      const schedulerAddr = config.bootstrap?.transactions?.scheduler || '';
      const aosPublisherAddr = config.bootstrap?.transactions?.aosModulePublisher || '';
      const bundlerAddr = await getBundlerAddress();
      const aoAddr = await getAuthority();
      
      const getBalance = async (addr: string) => {
        try {
          const balance = await arweave.wallets.getBalance(addr);
          return parseInt(balance, 10);
        } catch {
          return 0;
        }
      };
      
      const minBalance = 1000000000; // 0.001 AR minimum
      
      const [schedulerBal, aosPubBal, bundlerBal, aoBal] = await Promise.all([
        getBalance(schedulerAddr),
        getBalance(aosPublisherAddr),
        getBalance(bundlerAddr),
        getBalance(aoAddr),
      ]);
      
      walletBalances = {
        scheduler: { address: schedulerAddr, balance: schedulerBal, sufficient: schedulerBal >= minBalance },
        aosPublisher: { address: aosPublisherAddr, balance: aosPubBal, sufficient: aosPubBal >= minBalance },
        bundler: { address: bundlerAddr, balance: bundlerBal, sufficient: bundlerBal >= minBalance },
        ao: { address: aoAddr, balance: aoBal, sufficient: aoBal >= minBalance },
      };
      
      if (!walletBalances.scheduler.sufficient) {
        issues.push('Scheduler wallet has insufficient balance');
      }
      if (!walletBalances.aosPublisher.sufficient) {
        issues.push('AOS module publisher wallet has insufficient balance');
      }
      if (!walletBalances.bundler.sufficient) {
        issues.push('Bundler wallet has insufficient balance');
      }
      if (!walletBalances.ao.sufficient) {
        issues.push('AO wallet has insufficient balance');
      }
    } catch (error) {
      // Wallet balance check is optional
    }
  }
  
  const isSeeded = schedulerLocationAccessible && aosModuleAccessible && issues.length === 0;
  
  return {
    isSeeded,
    schedulerLocation: {
      exists: !!schedulerLocationTxId,
      txId: schedulerLocationTxId || null,
      accessible: schedulerLocationAccessible,
      error: schedulerLocationError,
    },
    aosModule: {
      exists: !!aosModuleTxId,
      txId: aosModuleTxId || null,
      accessible: aosModuleAccessible,
      error: aosModuleError,
    },
    walletBalances,
    issues,
    lastBootstrap: config.bootstrap?.lastBootstrap || null,
  };
}

/**
 * Ensure the localnet is properly seeded
 * Checks if scheduler location and AOS module exist, and seeds if missing
 * 
 * @param options - Options for ensuring seed
 * @param options.force - Force re-seeding even if data exists
 * @param options.onProgress - Callback for progress updates
 * @param options.verify - Perform comprehensive verification before seeding
 * @returns true if seeding was performed, false if already seeded
 */
export async function ensureSeeded(options: {
  force?: boolean;
  onProgress?: (message: string) => void;
  verify?: boolean;
} = {}): Promise<boolean> {
  const { force = false, onProgress, verify = true } = options;
  
  // Perform comprehensive verification if requested
  if (!force && verify) {
    onProgress?.('🔍 Verifying localnet seeding status...');
    const status = await getSeedingStatus(false);
    
    if (status.isSeeded) {
      onProgress?.('✅ Localnet is properly seeded');
      return false;
    }
    
    // Report issues found
    if (status.issues.length > 0) {
      onProgress?.(`⚠️  Seeding issues detected:`);
      status.issues.forEach(issue => {
        onProgress?.(`   - ${issue}`);
      });
    }
    
    onProgress?.('🔧 Re-seeding required...');
  } else if (!force) {
    // Simple check (backwards compatible)
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
    
    // Verify seeding was successful
    if (verify) {
      onProgress?.('🔍 Verifying seed completed successfully...');
      clearConfigCache(); // Reload config with new bootstrap data
      const status = await getSeedingStatus(false);
      
      if (!status.isSeeded) {
        throw new Error(`Seeding completed but verification failed:\n${status.issues.join('\n')}`);
      }
    }
    
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
  const wallet = loadWallet(walletPath);
  
  return await arweave.wallets.jwkToAddress(wallet);
}

/**
 * Load a wallet from file
 */
export function loadWallet(walletPath: string) {
  // Try multiple locations to support both development and installed package usage
  const locations = [
    // 1. Relative to current working directory (when running from source)
    resolve(process.cwd(), walletPath),
    // 2. Relative to package root (when installed as dependency)
    resolve(__dirname, '..', walletPath),
  ];
  
  // 3. Try resolving symlinks for pnpm file: protocol installs
  try {
    const realPath = realpathSync(resolve(__dirname, '..'));
    locations.push(resolve(realPath, walletPath));
  } catch {
    // Ignore if realpath fails
  }
  
  for (const fullPath of locations) {
    try {
      return JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (error) {
      // Try next location
      continue;
    }
  }
  
  // If all locations fail, throw with helpful error
  throw new Error(
    `Wallet not found at: ${walletPath}\n` +
    `Tried locations:\n${locations.map(p => `  - ${p}`).join('\n')}\n` +
    `Make sure wallets are generated with: pnpm run configure`
  );
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
  const wallet = loadWallet(walletPath);
  
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
  getSeedingStatus,
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

