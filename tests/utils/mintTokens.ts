import Arweave from 'arweave';
import { getLocalnetUrls, getAoWallet } from './config.js';

/**
 * Mint AR tokens for the test wallet on ArLocal
 */
export async function mintTokensForWallet(amount = '1000000000000000'): Promise<void> {
  const urls = getLocalnetUrls();
  const wallet = getAoWallet();

  // Parse gateway URL
  const gatewayUrl = new URL(urls.gateway);
  const arweave = Arweave.init({
    host: gatewayUrl.hostname,
    port: parseInt(gatewayUrl.port) || 80,
    protocol: gatewayUrl.protocol.replace(':', ''),
  });

  // Get wallet address
  const address = await arweave.wallets.jwkToAddress(wallet);
  
  console.log(`💰 Minting ${amount} Winston for ${address}...`);

  try {
    // ArLocal mint endpoint
    const response = await fetch(`${urls.gateway}/mint/${address}/${amount}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Mint failed: ${response.status} ${response.statusText}`);
    }

    const balance = await arweave.wallets.getBalance(address);
    console.log(`✅ Balance: ${arweave.ar.winstonToAr(balance)} AR`);
  } catch (error) {
    console.error(`❌ Failed to mint tokens:`, error.message);
    throw error;
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(): Promise<string> {
  const urls = getLocalnetUrls();
  const wallet = getAoWallet();

  const gatewayUrl = new URL(urls.gateway);
  const arweave = Arweave.init({
    host: gatewayUrl.hostname,
    port: parseInt(gatewayUrl.port) || 80,
    protocol: gatewayUrl.protocol.replace(':', ''),
  });

  const address = await arweave.wallets.jwkToAddress(wallet);
  const balance = await arweave.wallets.getBalance(address);
  
  return arweave.ar.winstonToAr(balance);
}

