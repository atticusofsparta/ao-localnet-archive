#!/bin/sh

NPM_SCRIPT=$1
shift 1

# Get the package installation directory (for accessing templates/scripts)
AO_LOCALNET_DIR=$(dirname $(realpath $0))

# Save the user's original working directory so scripts can find user's config
export AO_LOCALNET_USER_DIR="$PWD"

# Export the package dir so config.mjs can find template files
export AO_LOCALNET_PACKAGE_DIR="$AO_LOCALNET_DIR"

# For init/config commands, stay in user's cwd to create files there
# For other commands, cd to package directory (existing behavior)
case "$NPM_SCRIPT" in
  init)
    node "$AO_LOCALNET_DIR/config.mjs" init "$@"
    ;;
  config:init)
    node "$AO_LOCALNET_DIR/config.mjs" init "$@"
    ;;
  config:apply)
    node "$AO_LOCALNET_DIR/config.mjs" apply "$@"
    ;;
  config:show)
    node "$AO_LOCALNET_DIR/config.mjs" show "$@"
    ;;
  *)
    # For other commands, cd to package directory (existing behavior)
    cd "$AO_LOCALNET_DIR" && npm run $NPM_SCRIPT -- "$@"
    ;;
esac
