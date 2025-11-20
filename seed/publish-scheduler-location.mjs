#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { instance as arweave } from './utils/arweave.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const wallet = JSON.parse(await readFile(import.meta.resolve('../wallets/scheduler-location-publisher-wallet.json').slice(7), 'utf8'))
const address = await arweave.wallets.getAddress(wallet)

console.log('scheduler location publisher address:', address)

const tx = await arweave.createTransaction({
  data: Math.random.toString().slice(-4)
})

tx.addTag('Data-Protocol', 'ao')
tx.addTag('Type', 'Scheduler-Location')
tx.addTag('Variant', 'ao.LN.1')
tx.addTag('Url', 'http://su')
tx.addTag('Time-To-Live', '1')

await arweave.transactions.sign(tx, wallet)

console.log('POST /tx')

const res = await arweave.transactions.post(tx)

if (res.status === 200) {
  console.log(`${res.status} ${res.statusText}`)
  console.log(`tx id : ${tx.id}`)
  
  // Update config with scheduler info
  const configPath = resolve(__dirname, '../.ao-localnet.config.json')
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  
  if (!config.bootstrap) config.bootstrap = {}
  if (!config.bootstrap.transactions) config.bootstrap.transactions = {}
  
  config.bootstrap.transactions.scheduler = address
  config.bootstrap.transactions.schedulerLocation = tx.id
  config.bootstrap.lastBootstrap = new Date().toISOString()
  
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8')
  console.log(`✅ Saved scheduler location to config: ${tx.id}`)
} else {
  console.log(`${res.status} ${JSON.stringify(res.statusText, null, 2)}`)
}
