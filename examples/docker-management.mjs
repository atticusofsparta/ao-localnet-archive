/**
 * Example: Docker Management
 * 
 * This example demonstrates how to programmatically manage
 * the AO localnet Docker containers.
 */

import {
  getAllServicesStatus,
  getHealthStatus,
  waitForService,
  waitForAllServices,
  getContainerLogs,
  restartService,
  isServiceReady,
  waitForServiceReady,
  getServiceUrl,
} from '../dist/index.js';

async function main() {
  console.log('🐳 AO Localnet Docker Management\n');

  // 1. Check status of all services
  console.log('1️⃣  Checking status of all services...');
  const statuses = await getAllServicesStatus();
  
  for (const [service, status] of Object.entries(statuses)) {
    if (status) {
      const icon = status.running ? '✅' : '❌';
      const health = status.health !== 'none' ? ` (${status.health})` : '';
      console.log(`   ${icon} ${service}: ${status.state}${health}`);
    } else {
      console.log(`   ⚠️  ${service}: not found`);
    }
  }

  // 2. Get detailed health status
  console.log('\n2️⃣  Getting health status...');
  const health = await getHealthStatus();
  
  const healthyCount = health.filter(h => h.healthy).length;
  console.log(`   ${healthyCount}/${health.length} services healthy`);
  
  for (const h of health) {
    const icon = h.healthy ? '✅' : '❌';
    console.log(`   ${icon} ${h.service}: ${h.status}`);
  }

  // 3. Check if MU is ready
  console.log('\n3️⃣  Checking if MU is ready...');
  const muReady = await isServiceReady('mu');
  console.log(`   MU ready: ${muReady ? '✅' : '❌'}`);
  
  if (muReady) {
    const muUrl = getServiceUrl('mu');
    console.log(`   MU URL: ${muUrl}`);
  }

  // 4. Wait for arlocal to be healthy (with timeout)
  console.log('\n4️⃣  Waiting for arlocal to be healthy...');
  const arLocalHealthy = await waitForService('arlocal', 10000);
  console.log(`   ArLocal healthy: ${arLocalHealthy ? '✅' : '❌'}`);

  // 5. Get recent logs from MU
  console.log('\n5️⃣  Getting recent MU logs (last 10 lines)...');
  try {
    const logs = await getContainerLogs('mu', 10);
    const lines = logs.trim().split('\n').slice(-10);
    lines.forEach(line => {
      // Clean up Docker log formatting
      const cleaned = line.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      if (cleaned.trim()) {
        console.log(`   ${cleaned}`);
      }
    });
  } catch (error) {
    console.log(`   ⚠️  Could not get logs: ${error.message}`);
  }

  // 6. Example: Restart a service (commented out for safety)
  console.log('\n6️⃣  Service management example:');
  console.log('   To restart a service:');
  console.log('   await restartService("mu");');
  console.log('   await waitForServiceReady("mu");');

  // 7. Wait for all services (useful for testing)
  console.log('\n7️⃣  Example: Wait for all services to be healthy');
  console.log('   const allHealthy = await waitForAllServices(90000);');
  console.log('   This is useful in test setup to ensure the localnet is ready.');

  console.log('\n✨ Done!\n');
}

main().catch(console.error);

