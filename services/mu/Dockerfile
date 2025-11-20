################################################################################
# Download

FROM alpine:latest AS downloader
WORKDIR /download

RUN apk add git

ARG MU_VERSION=acb3852
RUN git clone https://github.com/permaweb/ao.git && cd ao && git checkout ${MU_VERSION}

################################################################################
# Build

FROM node:22 AS builder
WORKDIR /build
COPY --from=downloader /download/ao/servers/mu .

# No rate limit patches needed - using pre-rate-limit version (acb3852)

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
