################################################################################
# Download

FROM alpine:latest AS downloader
WORKDIR /download

RUN apk add git

ARG MU_VERSION=fa48943
RUN git clone https://github.com/permaweb/ao.git && cd ao && git checkout ${MU_VERSION}

################################################################################
# Build

FROM node:22 AS builder
WORKDIR /build
COPY --from=downloader /download/ao/servers/mu .

# Using version fa48943 (Sep 9, 2025) - has all hyperbeam device message handler fixes
# Comprehensive rate limit removal for localnet testing

# Remove all rate limit configuration
RUN sed -i '/IP_WALLET_RATE_LIMIT/d' src/config.js 2>/dev/null || true
RUN sed -i '/WALLET_RATE_LIMIT/d' src/config.js 2>/dev/null || true
RUN sed -i '/ipWalletRateLimit/d' src/config.js 2>/dev/null || true

# Set environment variables to disable rate limiting
ENV DEFAULT_RATE_LIMIT={}
ENV IP_WALLET_RATE_LIMIT=999999999
ENV IP_WALLET_RATE_LIMIT_INTERVAL=1
ENV WALLET_RATE_LIMIT_ENABLED=false

RUN npm install --ignore-engines --omit=dev

################################################################################
# Run

FROM node:22 AS runner
WORKDIR /app
COPY --from=builder /build/node_modules node_modules
COPY --from=builder /build/package.json .
COPY --from=builder /build/src src

EXPOSE 80
CMD ["npm", "start"]
