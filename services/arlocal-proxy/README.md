# Arlocal Proxy

A transparent proxy service that sits in front of `arlocal` and automatically mines blocks after transactions are submitted.

## Purpose

In a local development environment, transactions posted to arlocal are not automatically mined into blocks. This proxy solves that problem by:

1. Forwarding all requests to arlocal
2. Detecting successful POST/PUT requests (transaction submissions)
3. Automatically calling the `/mine` endpoint after each transaction
4. Returning the original response to the client

This ensures that transactions are immediately available without manual mining intervention.

## Architecture

```
Services (bundler, SU, etc.) 
    ↓
arlocal-proxy (auto-mines)
    ↓
arlocal (actual blockchain storage)
```

## Features

- **Transparent Proxy**: All requests are forwarded to arlocal unchanged
- **Automatic Mining**: Mines a block after every successful transaction
- **Race Condition Prevention**: Queues mining requests to prevent concurrent mine operations
- **Non-Blocking**: Mining happens in the background without delaying transaction responses
- **Health Check**: Proxies arlocal's health check endpoint

## Environment Variables

- `ARLOCAL_URL`: URL of the arlocal service (default: `http://arlocal:80`)
- `PORT`: Port to listen on (default: `80`)
- `DEBUG`: Debug logging configuration (default: `arlocal-proxy*`)

## Usage in Docker Compose

The proxy is configured to:
- Depend on arlocal being healthy
- Expose port 4000 to the host (same as arlocal was previously)
- Services connect to `http://arlocal-proxy:80` instead of `http://arlocal:80`

## Logging

Enable debug logging by setting `DEBUG=arlocal-proxy*` to see:
- Proxied requests and responses
- Mining operations
- Any errors during mining

## Development

To test locally:

```bash
cd services/arlocal-proxy
npm install
DEBUG=arlocal-proxy* ARLOCAL_URL=http://localhost:4000 node server.mjs
```

