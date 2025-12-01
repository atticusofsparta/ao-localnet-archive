# Changelog

## [Unreleased]

### Fixed
- **MU Rate Limiting Configuration**: Fixed issue where MU service was configured with incorrect environment variables that don't exist in its config.js
  - Now uses correct variables: `IP_WALLET_RATE_LIMIT` and `IP_WALLET_RATE_LIMIT_INTERVAL`
  - Rate limits are fully configurable via `.ao-localnet.config.json`
  - Defaults to unlimited (999,999 req/sec) for local testing
  - See `MU_RATE_LIMIT_FIX.md` and `MU_CONFIG_USER_CONTROL.md` for details

### Changed
- **MU Configuration**: `generateMuEnv()` now respects user's rate limit configuration from `.ao-localnet.config.json`
  - Users can set `services.mu.rateLimit.maxRequests` and `intervalMs`
  - Configuration is applied on `pnpm run config:apply`
  - Changes require container restart to take effect
- **arlocal Port**: Removed direct port exposure of arlocal service (now only accessible via arlocal-proxy on port 4000)

### Added
- **MU Config Tests**: New test suite `tests/mu-config.test.ts` verifying:
  - Default unlimited rate limits
  - User-configured rate limits are respected
  - Config changes are applied correctly
  - Backwards compatibility
  - Run with `pnpm test:mu-config`

### Added
- **Seeding Verification**: Added comprehensive seeding health checks and auto-healing
  - New `getSeedingStatus()` function for detailed diagnostics
  - Enhanced `ensureSeeded()` with verification and auto-healing
  - CLI tool: `examples/check-seeding-status.mjs`
  - See `SEEDING_VERIFICATION.md` for details

- **Wallet Loading Fix**: Fixed wallet loading to prioritize project directory over installation directory
  - Updated `getAuthority()` and `getBundlerAddress()` to use `loadWallet()` helper
  - See `WALLET_LOADING_FIX.md` for details

## [1.0.0] - 2025-11-30

### Added
- Initial release of AO Localnet SDK
- Docker Compose orchestration for all AO services
- Configuration system with `.ao-localnet.config.json`
- Auto-seeding functionality
- Rate limit patching for MU service
- E2E test suite
- LocalnetClient for programmatic control
