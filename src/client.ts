/**
 * AO Localnet Client
 * 
 * High-level API for managing the entire AO localnet lifecycle.
 * Provides elegant start/stop methods with persistence and cleanup options.
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { resolve } from 'path';
import { getDockerClient, getContainerStatus, isServiceHealthy, waitForServiceReady, type ServiceName } from './docker.js';
import { loadConfig, ensureSeeded } from './index.js';

/**
 * Localnet startup options
 */
export interface LocalnetStartOptions {
  /**
   * Whether to persist data between restarts
   * @default true
   */
  persist?: boolean;
  
  /**
   * Whether to wait for all services to be healthy before returning
   * @default true
   */
  waitForHealthy?: boolean;
  
  /**
   * Timeout in milliseconds to wait for services to be healthy
   * @default 120000 (2 minutes)
   */
  healthTimeout?: number;
  
  /**
   * Specific services to start (if not provided, starts all enabled services)
   */
  services?: ServiceName[];
  
  /**
   * Whether to pull latest images before starting
   * @default false
   */
  pull?: boolean;
  
  /**
   * Whether to rebuild images before starting
   * @default false
   */
  rebuild?: boolean;
  
  /**
   * Environment variables to pass to docker compose
   */
  env?: Record<string, string>;
  
  /**
   * Whether to run in detached mode
   * @default true
   */
  detached?: boolean;
  
  /**
   * Whether to automatically seed if scheduler location or AOS module are missing
   * @default true
   */
  autoSeed?: boolean;
  
  /**
   * Callback for startup progress updates
   */
  onProgress?: (message: string) => void;
}

/**
 * Localnet shutdown options
 */
export interface LocalnetStopOptions {
  /**
   * Whether to remove volumes (clears all persisted data)
   * @default false
   */
  removeVolumes?: boolean;
  
  /**
   * Timeout in seconds for graceful shutdown
   * @default 10
   */
  timeout?: number;
  
  /**
   * Whether to remove containers after stopping
   * @default false
   */
  removeContainers?: boolean;
  
  /**
   * Callback for shutdown progress updates
   */
  onProgress?: (message: string) => void;
}

/**
 * Localnet client for managing the entire localnet lifecycle
 */
export class LocalnetClient {
  private config = loadConfig();
  private projectRoot: string;
  private composeFile: string;
  private composeOverrideFile: string;
  
  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.composeFile = resolve(this.projectRoot, 'docker-compose.yml');
    this.composeOverrideFile = resolve(this.projectRoot, 'docker-compose.override.yml');
  }
  
  /**
   * Start the localnet
   */
  async start(options: LocalnetStartOptions = {}): Promise<void> {
    const {
      persist = true,
      waitForHealthy = true,
      healthTimeout = 120000,
      services,
      pull = false,
      rebuild = false,
      env = {},
      detached = true,
      autoSeed = true,
      onProgress,
    } = options;
    
    onProgress?.('🚀 Starting AO Localnet...');
    
    // If not persisting, clean up data directories first
    if (!persist) {
      onProgress?.('🧹 Cleaning data directories (non-persistent mode)...');
      await this.cleanDataDirectories();
    }
    
    // Build docker compose command
    const cmd: string[] = ['docker', 'compose'];
    
    if (pull) {
      onProgress?.('📥 Pulling latest images...');
      this.execCommand([...cmd, 'pull'], env);
    }
    
    const upCmd = [...cmd, 'up'];
    
    if (detached) {
      upCmd.push('--detach');
    }
    
    if (rebuild) {
      upCmd.push('--build');
    }
    
    if (services && services.length > 0) {
      upCmd.push(...services);
    }
    
    onProgress?.('🐳 Starting containers...');
    this.execCommand(upCmd, env);
    
    if (waitForHealthy && detached) {
      onProgress?.('⏳ Waiting for services to be healthy...');
      const servicesToWait = services || this.getEnabledServices();
      await this.waitForServices(servicesToWait, healthTimeout, onProgress);
    }
    
    // Auto-seed if enabled and needed
    if (autoSeed && waitForHealthy) {
      onProgress?.('🔍 Checking if seeding is required...');
      try {
        await ensureSeeded({ onProgress });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        onProgress?.(`⚠️  Warning: Auto-seed failed: ${errorMessage}`);
        // Don't throw - let the user handle seeding manually if needed
      }
    }
    
    onProgress?.('✅ Localnet started successfully!');
  }
  
  /**
   * Stop the localnet
   */
  async stop(options: LocalnetStopOptions = {}): Promise<void> {
    const {
      removeVolumes = false,
      timeout = 10,
      removeContainers = false,
      onProgress,
    } = options;
    
    onProgress?.('🛑 Stopping AO Localnet...');
    
    const cmd: string[] = ['docker', 'compose', 'down'];
    
    if (timeout) {
      cmd.push('--timeout', timeout.toString());
    }
    
    if (removeVolumes) {
      onProgress?.('🗑️  Removing volumes...');
      cmd.push('--volumes');
    }
    
    if (removeContainers) {
      cmd.push('--remove-orphans');
    }
    
    this.execCommand(cmd);
    
    onProgress?.('✅ Localnet stopped successfully!');
  }
  
  /**
   * Restart the localnet
   */
  async restart(options: LocalnetStartOptions = {}): Promise<void> {
    const { persist = true, onProgress } = options;
    
    // If not persisting, remove volumes during stop
    await this.stop({ 
      timeout: 10,
      removeVolumes: !persist,
      onProgress: (msg) => onProgress?.(`[Stop] ${msg}`),
    });
    
    // Small delay to ensure clean shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.start({
      ...options,
      onProgress: (msg) => onProgress?.(`[Start] ${msg}`),
    });
  }
  
  /**
   * Reset the localnet (stop, clean data, restart)
   */
  async reset(startOptions: LocalnetStartOptions = {}): Promise<void> {
    const onProgress = startOptions.onProgress;
    
    onProgress?.('🔄 Resetting localnet...');
    
    await this.stop({ 
      removeVolumes: true,
      onProgress: (msg) => onProgress?.(`[Stop] ${msg}`),
    });
    
    onProgress?.('🧹 Cleaning all data...');
    await this.cleanDataDirectories();
    await this.cleanVolumes();
    
    await this.start({
      ...startOptions,
      persist: true,
      onProgress: (msg) => onProgress?.(`[Start] ${msg}`),
    });
    
    onProgress?.('✅ Reset complete!');
  }
  
  /**
   * Get status of all services
   */
  async getStatus(): Promise<Record<ServiceName, any>> {
    const services = this.getEnabledServices();
    const statuses: Record<string, any> = {};
    
    for (const service of services) {
      const status = await getContainerStatus(service);
      const healthy = status ? await isServiceHealthy(service) : false;
      
      statuses[service] = {
        running: status?.running ?? false,
        healthy,
        state: status?.state ?? 'not found',
        status: status?.status ?? 'not found',
      };
    }
    
    return statuses;
  }
  
  /**
   * Check if the localnet is running
   */
  async isRunning(): Promise<boolean> {
    const services = this.getEnabledServices();
    const statuses = await Promise.all(
      services.map(service => getContainerStatus(service))
    );
    
    return statuses.some(status => status?.running);
  }
  
  /**
   * Check if all services are healthy
   */
  async isHealthy(): Promise<boolean> {
    const services = this.getEnabledServices();
    const healthChecks = await Promise.all(
      services.map(service => isServiceHealthy(service))
    );
    
    return healthChecks.every(healthy => healthy);
  }
  
  /**
   * Clean data directories
   */
  private async cleanDataDirectories(): Promise<void> {
    // These are the actual paths used in docker-compose.override.yml
    // (bind mounts point to .ao-localnet/* directories)
    const dataPaths = [
      '.ao-localnet/arlocal',
      '.ao-localnet/cu',
      '.ao-localnet/mu',
      '.ao-localnet/su',
      '.ao-localnet/bundler',
    ];
    
    for (const dataPath of dataPaths) {
      const fullPath = resolve(this.projectRoot, dataPath);
      if (existsSync(fullPath)) {
        console.log(`   Removing ${dataPath}...`);
        rmSync(fullPath, { recursive: true, force: true });
      }
    }
  }
  
  /**
   * Clean Docker volumes
   */
  private async cleanVolumes(): Promise<void> {
    const docker = getDockerClient();
    const volumes = await docker.listVolumes();
    
    // Remove project-specific volumes
    const projectVolumes = volumes.Volumes?.filter(v => 
      v.Name.includes('ao-localnet')
    ) || [];
    
    for (const volume of projectVolumes) {
      try {
        const vol = docker.getVolume(volume.Name);
        await vol.remove({ force: true });
      } catch (error) {
        // Volume might be in use or already removed
        console.warn(`Could not remove volume ${volume.Name}:`, error);
      }
    }
  }
  
  /**
   * Wait for services to be ready
   */
  private async waitForServices(
    services: ServiceName[],
    timeout: number,
    onProgress?: (message: string) => void
  ): Promise<void> {
    const startTime = Date.now();
    
    for (const service of services) {
      const remaining = timeout - (Date.now() - startTime);
      if (remaining <= 0) {
        throw new Error(`Timeout waiting for services to be healthy`);
      }
      
      onProgress?.(`   Waiting for ${service}...`);
      const ready = await waitForServiceReady(service, remaining);
      
      if (!ready) {
        throw new Error(`Service ${service} failed to become healthy within timeout`);
      }
      
      onProgress?.(`   ✅ ${service} is ready`);
    }
  }
  
  /**
   * Get list of enabled services from config
   */
  private getEnabledServices(): ServiceName[] {
    const allServices: ServiceName[] = [
      'arlocal',
      'mu',
      'su',
      'su-database',
      'cu',
      'scar',
      'bundler',
      'lunar',
    ];
    
    return allServices.filter(service => {
      if (service === 'su-database') {
        // su-database is enabled if su is enabled
        return this.config.services.su?.enabled !== false;
      }
      return this.config.services[service]?.enabled !== false;
    });
  }
  
  /**
   * Execute a docker compose command synchronously
   */
  private execCommand(cmd: string[], env: Record<string, string> = {}): void {
    execSync(cmd.join(' '), {
      cwd: this.projectRoot,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
  }
  
  /**
   * Graceful shutdown handler
   * Call this to ensure clean shutdown on process exit
   */
  async setupGracefulShutdown(options: LocalnetStopOptions = {}): Promise<void> {
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      
      try {
        await this.stop({
          ...options,
          onProgress: (msg) => console.log(msg),
        });
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

/**
 * Create a new localnet client instance
 */
export function createLocalnetClient(projectRoot?: string): LocalnetClient {
  return new LocalnetClient(projectRoot);
}

/**
 * Default export for convenience
 */
export default LocalnetClient;

