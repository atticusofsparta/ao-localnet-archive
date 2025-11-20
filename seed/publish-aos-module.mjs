#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { instance as arweave } from './utils/arweave.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const wallet = JSON.parse(await readFile(import.meta.resolve('../wallets/aos-module-publisher-wallet.json').slice(7), 'utf8'))
const address = await arweave.wallets.getAddress(wallet)

console.log('aos publisher address:', address)

const tx = await arweave.createTransaction({
  data: await readFile('extras/aos.wasm'),
})

tx.addTag('Memory-Limit',    '1-gb'                                      )
tx.addTag('Compute-Limit',   '9000000000000'                             )
tx.addTag('Module-Format',   'wasm64-unknown-emscripten-draft_2024_02_15')
tx.addTag('AOS-Version',      '2.0.3'                                    )
tx.addTag('Name',            'aos-lg-2.0.3'                              )
tx.addTag('Data-Protocol',   'ao'                                        )
tx.addTag('Type',            'Module'                                    )
tx.addTag('Input-Encoding',  'JSON-1'                                    )
tx.addTag('Output-Encoding', 'JSON-1'                                    )
tx.addTag('Variant',         'ao.LN.1'                                   )
tx.addTag('Content-Type',    'application/wasm'                          )

await arweave.transactions.sign(tx, wallet)

console.log('POST /tx')

const res = await arweave.transactions.post(tx)

if (res.status === 200) {
  console.log(`${res.status} ${res.statusText}`)
  console.log(`aos module: ${tx.id}`)
  
  // Update config with module info
  const configPath = resolve(__dirname, '../.ao-localnet.config.json')
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  
  if (!config.bootstrap) config.bootstrap = {}
  if (!config.bootstrap.transactions) config.bootstrap.transactions = {}
  
  config.bootstrap.transactions.aosModule = tx.id
  config.bootstrap.transactions.aosModulePublisher = address
  config.bootstrap.lastBootstrap = new Date().toISOString()
  
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8')
  console.log(`✅ Saved AOS module to config: ${tx.id}`)
} else {
  console.log(`${res.status} ${JSON.stringify(res.statusText, null, 2)}`)
}
