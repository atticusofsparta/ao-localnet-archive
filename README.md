# ao-localnet

Run a complete [AO Computer](http://ao.computer/) testbed, locally, with Docker Compose.

> [!CAUTION]
> **This is an experimental repo that is intended for power users.**
>
> Please join the Marshal [Discord server](https://discord.gg/KzSRvefPau) for help and support.

## Purpose

The repository may helpful if you are doing one or more of the following:

1. Contributing to [@permaweb/ao](https://github.com/permaweb/ao).
1. Compiling custom `ao` modules using the [AO Dev CLI](https://github.com/permaweb/dev-cli) or other [another build process](https://github.com/MichaelBuhler/custom-ao-modules).
   - And you want to avoid publishing each revision onto Arweave mainnet.
1. You are developing an `ao` component (e.g. a `cu`, `mu`, or `su`).
   - And you want to plug that into a working environment.
1. You are developing Lua code that will be loaded into `aos` processes.
   - And you want to avoid bricking your `aos` processes on `ao` testnet.

## Quick Start Guide (as Node.js module)

```shell
npm install https://github.com/MichaelBuhler/ao-localnet.git
npx ao-localnet configure     # generate wallets and download AOS module
npx ao-localnet start         # run Docker containers (build them if necessary)
npx ao-localnet seed          # seed AOS and Scheduler info into the localnet
npx ao-localnet spawn "name"  # spawn AOS process with correction Authority tag
npx ao-localnet aos "name"    # connect to the new AOS process by name

npx ao-localnet reset         # delete all data in the localnet
npx ao-localnet reseed        # delete all data, then seed it again

npx ao-localnet stop          # tear down Docker containers (data is retained)
```

## Quick Start Guide (Run from source)

1. Clone this repo.
1. Setup the necessary Arweave wallets:
    1. `cd` into the `wallets` directory (at the root of this repo).
    1. Run `./generateAll.sh` to create new wallets for everything.
        - _See [wallets/README.md](./wallets/README.md) for more details._
1. Boot up the localnet:
    1. Run `docker compose up --detach`.
        - _You will need to have the Docker daemon running._
        - _This could take a while the first time you run it._
      - You will have many services now bound to ports in the 4000 range (all subject to change):
          - http://localhost:4000/ - ArLocal (Arweave gateway/mock)
          - http://localhost:4002/ - An `ao` messenger unit (`mu`).
          - http://localhost:4003/ - An `ao` schedule unit (`su`).
          - http://localhost:4004/ - An `ao` compute unit (`cu`).
          - http://localhost:4007/ - A simple Arweave bundler/uploader
1. Seed initial data onto the blockchain:
    1. `cd` into the `seed` directory (at the root of this repo).
    1. Run `./download-aos-module.sh` to fetch an AOS WASM binary from Arweave.
    1. Run `./seed-for-aos.sh` to grant AR tokens to the wallets and publish the AOS module.
1. Run `aos`:
    1. Run `./aos.sh`.

## Development Status of this Repo

> [!WARNING]
> Much of this section is currently outdated. WIP.

- ✅ ArLocal instance mocking Arweave and acting as Arweave gateway.
  - ℹ️ There are some features missing from [the upstream](https://github.com/textury/arlocal)
    that tend to be used by block explorers, so we are using
    [this fork](https://github.com/MichaelBuhler/arlocal), which fixes:
    - ✅ Added `GET /tx/pending` to fetch pending transaction ids
    - ✅ Added `GET /raw/:txid` to download raw transaction data
    - ✅ Fix some bugs in chunk uploading/downloading
    - ⬜ Blocks don't include `block_size` ([#1](https://github.com/MichaelBuhler/arlocal/issues/1))
    - ⬜ Blocks don't include `reward_addr` ([#3](https://github.com/MichaelBuhler/arlocal/issues/3))
    - ⬜ Blocks don't include `weave_size` ([#2](https://github.com/MichaelBuhler/arlocal/issues/2))
- ✅ Arweave block explorer (web interface).
  - ✅ ScAR - A lightweight option from [here](https://github.com/renzholy/scar),
    forked [here](https://github.com/MichaelBuhler/scar), with improvements.
  - ⬜ ArweaveWebWallet - Another option from [here](https://github.com/jfbeats/ArweaveWebWallet)
    which powers https://arweave.app/.
- ✅ Fully functional `ao` computer, using the
  [reference implementations](https://github.com/permaweb/ao/servers).
  - ✅ `cu`
  - ✅ `mu`
  - ✅ `su`
- ✅ Successfully launching `aos` processes on the `ao` localnet.
- ⬜ nginx reverse proxy, for hostname routing
  - Currently in testing. [This](https://hub.docker.com/r/nginxproxy/nginx-proxy) looks promising.
- ⬜ DNS routing
  - ✅ Routing `*.ao-localnet.xyz` to `127.0.0.1` and `::1`
  - ℹ️ All containers should be reachable via `*.ao-localnet.xyz` domain names.
