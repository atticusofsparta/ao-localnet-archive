#!/usr/bin/env node
/**
 * Example: Check Localnet Seeding Status
 * 
 * Demonstrates how to use the seeding verification system to:
 * - Check if localnet is properly seeded
 * - Get detailed diagnostic information
 * - Automatically heal seeding issues
 */

import { getSeedingStatus, ensureSeeded } from 'ao-localnet';

async function checkSeedingStatus() {
  console.log('🔍 Checking AO Localnet Seeding Status...\n');
  
  // Get basic seeding status
  const status = await getSeedingStatus(false);
  
  console.log('Overall Status:', status.isSeeded ? '✅ Seeded' : '❌ Not Seeded');
  console.log();
  
  // Scheduler Location
  console.log('📍 Scheduler Location:');
  console.log('  Configured:', status.schedulerLocation.exists ? '✅' : '❌');
  if (status.schedulerLocation.txId) {
    console.log('  TX ID:', status.schedulerLocation.txId);
    console.log('  Accessible:', status.schedulerLocation.accessible ? '✅' : '❌');
    if (status.schedulerLocation.error) {
      console.log('  Error:', status.schedulerLocation.error);
    }
  }
  console.log();
  
  // AOS Module
  console.log('📦 AOS Module:');
  console.log('  Configured:', status.aosModule.exists ? '✅' : '❌');
  if (status.aosModule.txId) {
    console.log('  TX ID:', status.aosModule.txId);
    console.log('  Accessible:', status.aosModule.accessible ? '✅' : '❌');
    if (status.aosModule.error) {
      console.log('  Error:', status.aosModule.error);
    }
  }
  console.log();
  
  // Issues
  if (status.issues.length > 0) {
    console.log('⚠️  Issues Detected:');
    status.issues.forEach(issue => {
      console.log('  -', issue);
    });
    console.log();
  }
  
  // Last Bootstrap
  if (status.lastBootstrap) {
    const date = new Date(status.lastBootstrap);
    console.log('🕐 Last Bootstrap:', date.toLocaleString());
    console.log();
  }
  
  return status;
}

async function checkWalletBalances() {
  console.log('💰 Checking Wallet Balances...\n');
  
  const status = await getSeedingStatus(true); // verbose mode
  
  if (status.walletBalances) {
    console.log('Wallet Balances:');
    
    const formatBalance = (balance) => {
      const ar = balance / 1000000000000;
      return `${ar.toFixed(6)} AR (${balance} winston)`;
    };
    
    Object.entries(status.walletBalances).forEach(([name, info]) => {
      const status = info.sufficient ? '✅' : '❌';
      const truncatedAddr = `${info.address.slice(0, 8)}...${info.address.slice(-8)}`;
      console.log(`  ${name.padEnd(15)} ${status} ${formatBalance(info.balance)}`);
      console.log(`  ${' '.repeat(17)} (${truncatedAddr})`);
    });
    console.log();
  }
}

async function autoHeal() {
  console.log('🔧 Auto-Healing Seeding Issues...\n');
  
  const wasSeeded = await ensureSeeded({
    verify: true,
    onProgress: (msg) => console.log(msg),
  });
  
  if (wasSeeded) {
    console.log('\n✅ Localnet was re-seeded successfully!');
  } else {
    console.log('\n✅ Localnet was already properly seeded!');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  try {
    switch (command) {
      case 'status':
        await checkSeedingStatus();
        break;
      
      case 'balances':
        await checkSeedingStatus();
        await checkWalletBalances();
        break;
      
      case 'heal':
        await checkSeedingStatus();
        console.log();
        await autoHeal();
        console.log();
        await checkSeedingStatus();
        break;
      
      case 'full':
        await checkSeedingStatus();
        await checkWalletBalances();
        
        const status = await getSeedingStatus(false);
        if (!status.isSeeded) {
          console.log();
          await autoHeal();
        }
        break;
      
      default:
        console.log('Usage: check-seeding-status.mjs [command]');
        console.log();
        console.log('Commands:');
        console.log('  status    - Check basic seeding status (default)');
        console.log('  balances  - Check status + wallet balances');
        console.log('  heal      - Check status + auto-heal if needed');
        console.log('  full      - Complete diagnostic + auto-heal');
        console.log();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

