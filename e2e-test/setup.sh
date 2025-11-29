#!/bin/bash
set -e

echo "🧪 Setting up E2E Test Environment"
echo "===================================="
echo ""

# Get the parent directory (ao-localnet-archive root)
PARENT_DIR="$(cd .. && pwd)"
echo "📦 Parent package: $PARENT_DIR"
echo ""

# Clean any previous installations
echo "🧹 Cleaning previous installations..."
rm -rf node_modules pnpm-lock.yaml
echo ""

# Initialize pnpm if needed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed!"
    echo "   Install with: npm install -g pnpm"
    exit 1
fi

# Install the parent package as a dependency
echo "📥 Installing ao-localnet from parent directory..."
pnpm add "file:$PARENT_DIR"
echo ""

# Verify installation
echo "✅ Verifying installation..."
if [ -d "node_modules/ao-localnet" ]; then
    echo "   ✅ ao-localnet installed"
else
    echo "   ❌ ao-localnet NOT installed!"
    exit 1
fi

# Check if dist directory exists in installed package
if [ -d "node_modules/ao-localnet/dist" ]; then
    echo "   ✅ Compiled SDK found (dist/)"
else
    echo "   ⚠️  No dist/ directory - building..."
    cd "$PARENT_DIR"
    pnpm run build
    cd -
fi

# Copy wallets from parent (simulates what users need to do)
echo "📁 Copying wallets from parent package..."
mkdir -p wallets
cp -r "$PARENT_DIR/wallets/"*.json wallets/ 2>/dev/null || true
if [ -f "wallets/ao-wallet.json" ]; then
    echo "   ✅ Wallets copied"
else
    echo "   ⚠️  No wallet files found (run 'pnpm run configure' in parent)"
fi

echo ""
echo "🎉 E2E Test Environment Ready!"
echo ""
echo "Run tests with:"
echo "  pnpm test           # Run all tests"
echo "  pnpm test:basic     # Test basic SDK usage"
echo "  pnpm test:client    # Test LocalnetClient"
echo "  pnpm test:auto-seed # Test auto-seeding"
echo "  pnpm test:rate-limit # Test rate limit fix"
echo ""

