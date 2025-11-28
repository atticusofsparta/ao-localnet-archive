import express from 'express'
import debug from 'debug'
import { createProxyMiddleware } from 'http-proxy-middleware'

const logger = debug('arlocal-proxy')

const ARLOCAL_URL = process.env.ARLOCAL_URL || 'http://arlocal:80'
const PORT = process.env.PORT || 80

logger('ARLOCAL_URL =', ARLOCAL_URL)
logger('PORT =', PORT)

const app = express()

// Track in-flight requests to prevent race conditions
let miningInProgress = false
const pendingMineRequests = []

async function mineBlock() {
  if (miningInProgress) {
    // Queue this mine request
    return new Promise((resolve) => {
      pendingMineRequests.push(resolve)
    })
  }

  miningInProgress = true
  
  try {
    const mineUrl = `${ARLOCAL_URL}/mine`
    logger('Mining block:', mineUrl)
    
    const response = await fetch(mineUrl, { method: 'GET' })
    
    if (response.ok) {
      const data = await response.json()
      logger('Successfully mined block. New height:', data.height)
    } else {
      logger('Failed to mine block:', response.status, response.statusText)
    }
  } catch (error) {
    logger('Error mining block:', error.message)
  } finally {
    miningInProgress = false
    
    // Process any queued mine requests
    if (pendingMineRequests.length > 0) {
      const queued = [...pendingMineRequests]
      pendingMineRequests.length = 0
      
      // Mine one more time for all queued requests
      await mineBlock()
      
      // Resolve all queued promises
      queued.forEach(resolve => resolve())
    }
  }
}

// Proxy all requests to arlocal
app.use('/', createProxyMiddleware({
  target: ARLOCAL_URL,
  changeOrigin: true,
  logLevel: 'silent', // Use our own logging
  
  // Intercept responses to mine after successful POSTs
  onProxyRes: (proxyRes, req, res) => {
    const method = req.method
    const path = req.path || req.url
    const status = proxyRes.statusCode
    
    logger(`${method} ${path} -> ${status}`)
    
    // Mine after successful POST/PUT requests (transaction submissions)
    // Skip mining for the /mine endpoint itself to avoid infinite loops
    if ((method === 'POST' || method === 'PUT') && 
        status >= 200 && status < 300 && 
        !path.includes('/mine')) {
      
      logger('Transaction posted successfully, triggering mine...')
      
      // Mine in background to not delay response
      setImmediate(() => {
        mineBlock().catch(err => {
          logger('Background mining error:', err.message)
        })
      })
    }
  },
  
  onError: (err, req, res) => {
    logger('Proxy error:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Proxy error', 
        message: err.message 
      })
    }
  }
}))

app.listen(PORT, () => {
  logger(`arlocal-proxy listening on port ${PORT}`)
  logger(`Proxying to ${ARLOCAL_URL}`)
})

