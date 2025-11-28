#!/bin/bash

# Test script for arlocal-proxy
# This script verifies that the proxy correctly forwards requests and auto-mines

set -e

PROXY_URL="${PROXY_URL:-http://localhost:4000}"

echo "Testing arlocal-proxy at $PROXY_URL"
echo "=========================================="

# Test 1: Health check (GET request should be proxied)
echo "Test 1: Health check (GET /info)"
response=$(curl -s "$PROXY_URL/info")
echo "Response: $response"
echo "✓ Health check passed"
echo ""

# Test 2: Get current height
echo "Test 2: Get current block height"
initial_height=$(curl -s "$PROXY_URL/info" | jq -r '.height')
echo "Initial height: $initial_height"
echo ""

# Test 3: Post a transaction and verify auto-mining
echo "Test 3: Post transaction and verify auto-mining"
echo "Creating a simple transaction..."

# Create a simple data transaction
tx_data='{"data":"test transaction from proxy test"}'
response=$(curl -s -X POST "$PROXY_URL/tx" \
  -H "Content-Type: application/json" \
  -d "$tx_data")

echo "Transaction response: $response"

# Wait a moment for mining to complete
echo "Waiting for auto-mine..."
sleep 2

# Check if height increased
new_height=$(curl -s "$PROXY_URL/info" | jq -r '.height')
echo "New height: $new_height"

if [ "$new_height" -gt "$initial_height" ]; then
  echo "✓ Auto-mining worked! Height increased from $initial_height to $new_height"
else
  echo "✗ Auto-mining may not have worked. Height: $initial_height -> $new_height"
  exit 1
fi

echo ""
echo "=========================================="
echo "All tests passed! ✓"

