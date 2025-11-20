/**
 * Docker Management for AO Localnet
 * 
 * Provides programmatic control over the localnet Docker containers
 * using dockerode.
 */

import Docker from 'dockerode';
import { loadConfig } from './index.js';

/**
 * Service names in the docker-compose setup
 */
export type ServiceName = 
  | 'arlocal'
  | 'mu'
  | 'su'
  | 'su-database'
  | 'cu'
  | 'scar'
  | 'bundler'
  | 'lunar';

/**
 * Container status information
 */
export interface ContainerStatus {
  name: string;
  id: string;
  state: string;
  status: string;
  running: boolean;
  health?: 'healthy' | 'unhealthy' | 'starting' | 'none';
}

/**
 * Service health check result
 */
export interface ServiceHealth {
  service: ServiceName;
  healthy: boolean;
  status: string;
  container?: ContainerStatus;
}

/**
 * Docker client singleton
 */
let dockerClient: Docker | null = null;

/**
 * Get or create Docker client
 */
export function getDockerClient(): Docker {
  if (!dockerClient) {
    dockerClient = new Docker();
  }
  return dockerClient;
}

/**
 * Get the container name for a service
 */
export function getContainerName(service: ServiceName): string {
  return `ao-localnet-archive-${service}-1`;
}

/**
 * Get all localnet container names
 */
export function getAllContainerNames(): string[] {
  const services: ServiceName[] = [
    'arlocal',
    'mu',
    'su',
    'su-database',
    'cu',
    'scar',
    'bundler',
    'lunar',
  ];
  return services.map(getContainerName);
}

/**
 * Find a container by service name
 */
export async function findContainer(service: ServiceName): Promise<Docker.ContainerInfo | null> {
  const docker = getDockerClient();
  const containerName = getContainerName(service);
  
  const containers = await docker.listContainers({ all: true });
  const container = containers.find(c => 
    c.Names.some(name => name === `/${containerName}` || name === containerName)
  );
  
  return container || null;
}

/**
 * Get container status
 */
export async function getContainerStatus(service: ServiceName): Promise<ContainerStatus | null> {
  const containerInfo = await findContainer(service);
  
  if (!containerInfo) {
    return null;
  }
  
  const health = containerInfo.Status.includes('(healthy)') ? 'healthy' :
                 containerInfo.Status.includes('(unhealthy)') ? 'unhealthy' :
                 containerInfo.Status.includes('(starting)') ? 'starting' :
                 containerInfo.Status.includes('(health') ? 'starting' : 'none';
  
  return {
    name: containerInfo.Names[0].replace(/^\//, ''),
    id: containerInfo.Id,
    state: containerInfo.State,
    status: containerInfo.Status,
    running: containerInfo.State === 'running',
    health: health as ContainerStatus['health'],
  };
}

/**
 * Check if a service is running
 */
export async function isServiceRunning(service: ServiceName): Promise<boolean> {
  const status = await getContainerStatus(service);
  return status?.running ?? false;
}

/**
 * Check if a service is healthy
 */
export async function isServiceHealthy(service: ServiceName): Promise<boolean> {
  const status = await getContainerStatus(service);
  if (!status || !status.running) return false;
  
  // If no health check is defined, consider running as healthy
  if (status.health === 'none') return true;
  
  return status.health === 'healthy';
}

/**
 * Wait for a service to be healthy
 */
export async function waitForService(
  service: ServiceName,
  timeoutMs: number = 60000,
  intervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const healthy = await isServiceHealthy(service);
    if (healthy) return true;
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

/**
 * Wait for all services to be healthy
 */
export async function waitForAllServices(
  timeoutMs: number = 90000
): Promise<boolean> {
  const services: ServiceName[] = ['arlocal', 'mu', 'su', 'su-database', 'cu', 'scar', 'bundler', 'lunar'];
  
  const results = await Promise.all(
    services.map(service => waitForService(service, timeoutMs))
  );
  
  return results.every(r => r);
}

/**
 * Get status of all services
 */
export async function getAllServicesStatus(): Promise<Record<ServiceName, ContainerStatus | null>> {
  const services: ServiceName[] = ['arlocal', 'mu', 'su', 'su-database', 'cu', 'scar', 'bundler', 'lunar'];
  
  const statuses = await Promise.all(
    services.map(async service => ({
      service,
      status: await getContainerStatus(service),
    }))
  );
  
  return statuses.reduce((acc, { service, status }) => {
    acc[service] = status;
    return acc;
  }, {} as Record<ServiceName, ContainerStatus | null>);
}

/**
 * Get health status of all services
 */
export async function getHealthStatus(): Promise<ServiceHealth[]> {
  const services: ServiceName[] = ['arlocal', 'mu', 'su', 'su-database', 'cu', 'scar', 'bundler', 'lunar'];
  
  return await Promise.all(
    services.map(async service => {
      const container = await getContainerStatus(service);
      const healthy = container?.running && (container.health === 'healthy' || container.health === 'none') || false;
      
      return {
        service,
        healthy,
        status: container?.status || 'not found',
        container: container || undefined,
      };
    })
  );
}

/**
 * Get container logs
 */
export async function getContainerLogs(
  service: ServiceName,
  tail: number = 100
): Promise<string> {
  const docker = getDockerClient();
  const containerInfo = await findContainer(service);
  
  if (!containerInfo) {
    throw new Error(`Container for service ${service} not found`);
  }
  
  const container = docker.getContainer(containerInfo.Id);
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: false,
  });
  
  return logs.toString('utf-8');
}

/**
 * Execute a command in a container
 */
export async function execInContainer(
  service: ServiceName,
  cmd: string[]
): Promise<string> {
  const docker = getDockerClient();
  const containerInfo = await findContainer(service);
  
  if (!containerInfo) {
    throw new Error(`Container for service ${service} not found`);
  }
  
  const container = docker.getContainer(containerInfo.Id);
  
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
  });
  
  const stream = await exec.start({ Detach: false });
  
  return new Promise((resolve, reject) => {
    let output = '';
    
    stream.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf-8');
    });
    
    stream.on('end', () => {
      resolve(output);
    });
    
    stream.on('error', reject);
  });
}

/**
 * Restart a service
 */
export async function restartService(service: ServiceName): Promise<void> {
  const docker = getDockerClient();
  const containerInfo = await findContainer(service);
  
  if (!containerInfo) {
    throw new Error(`Container for service ${service} not found`);
  }
  
  const container = docker.getContainer(containerInfo.Id);
  await container.restart();
}

/**
 * Stop a service
 */
export async function stopService(service: ServiceName, timeoutSec: number = 10): Promise<void> {
  const docker = getDockerClient();
  const containerInfo = await findContainer(service);
  
  if (!containerInfo) {
    throw new Error(`Container for service ${service} not found`);
  }
  
  const container = docker.getContainer(containerInfo.Id);
  await container.stop({ t: timeoutSec });
}

/**
 * Start a service
 */
export async function startService(service: ServiceName): Promise<void> {
  const docker = getDockerClient();
  const containerInfo = await findContainer(service);
  
  if (!containerInfo) {
    throw new Error(`Container for service ${service} not found. Run 'npm start' first.`);
  }
  
  const container = docker.getContainer(containerInfo.Id);
  await container.start();
}

/**
 * Get service URL from config
 */
export function getServiceUrl(service: ServiceName): string {
  const config = loadConfig();
  
  switch (service) {
    case 'arlocal':
      return config.urls.gateway;
    case 'mu':
      return config.urls.mu;
    case 'su':
      return config.urls.su;
    case 'cu':
      return config.urls.cu;
    case 'bundler':
      return config.urls.bundler;
    default:
      // For services without explicit URLs, construct from port
      const port = config.ports[service as keyof typeof config.ports];
      return `http://localhost:${port}`;
  }
}

/**
 * Check if service is accessible via HTTP
 */
export async function isServiceAccessible(service: ServiceName): Promise<boolean> {
  try {
    const url = getServiceUrl(service);
    const response = await fetch(url, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    // Any response (even error) means the service is accessible
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for service to be accessible via HTTP
 */
export async function waitForServiceAccessible(
  service: ServiceName,
  timeoutMs: number = 30000,
  intervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const accessible = await isServiceAccessible(service);
    if (accessible) return true;
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

/**
 * Comprehensive service readiness check
 * Checks both container health and HTTP accessibility
 */
export async function isServiceReady(service: ServiceName): Promise<boolean> {
  const healthy = await isServiceHealthy(service);
  if (!healthy) return false;
  
  // For services with HTTP endpoints, check accessibility
  const httpServices: ServiceName[] = ['arlocal', 'mu', 'su', 'cu', 'bundler', 'lunar'];
  if (httpServices.includes(service)) {
    return await isServiceAccessible(service);
  }
  
  return true;
}

/**
 * Wait for service to be fully ready
 */
export async function waitForServiceReady(
  service: ServiceName,
  timeoutMs: number = 60000
): Promise<boolean> {
  const startTime = Date.now();
  const intervalMs = 1000;
  
  while (Date.now() - startTime < timeoutMs) {
    const ready = await isServiceReady(service);
    if (ready) return true;
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

/**
 * Export Docker client for advanced usage
 */
export { Docker };

