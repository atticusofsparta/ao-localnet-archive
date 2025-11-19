/**
 * Test setup - Mint tokens and deploy module before running tests
 * This runs once before all tests
 */
import { deployAosModule } from './utils/deployModule.js';
import { mintTokensForWallet, getWalletBalance } from './utils/mintTokens.js';

let moduleId: string | undefined;

export async function setupTests() {
  if (moduleId) {
    return moduleId;
  }

  console.log('\n🔧 Setting up test environment...\n');
  
  try {
    // Mint tokens for the wallet
    await mintTokensForWallet();
    
    // Deploy the AOS module
    moduleId = await deployAosModule();
    
    const balance = await getWalletBalance();
    console.log(`\n✅ Test environment ready!`);
    console.log(`   Module: ${moduleId}`);
    console.log(`   Balance: ${balance} AR\n`);
    
    return moduleId;
  } catch (error) {
    console.error('\n❌ Failed to setup test environment:', error);
    throw error;
  }
}

export function getModuleId(): string {
  if (!moduleId) {
    throw new Error('Module not deployed yet. Call setupTests() first.');
  }
  return moduleId;
}

