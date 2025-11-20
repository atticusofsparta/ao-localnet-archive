/**
 * Test utilities - re-export from SDK
 * 
 * This file now acts as a compatibility layer, re-exporting
 * functions from the main SDK to maintain test compatibility.
 */

export {
  loadConfig,
  getUrls as getLocalnetUrls,
  getScheduler,
  loadWallet,
  getAoWallet,
  createAoSigner,
  getAoInstance,
  getAosModule,
  getAuthority,
  getBootstrapInfo,
} from '../../dist/index.js';

