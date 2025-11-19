################################################################################
# Download

FROM alpine:latest AS downloader
WORKDIR /download

RUN apk add git

ARG MU_VERSION=main
RUN git clone --branch=${MU_VERSION} --depth=1 https://github.com/permaweb/ao.git

################################################################################
# Build

FROM node:22 AS builder
WORKDIR /build
COPY --from=downloader /download/ao/servers/mu .

# Patch MU to support DEFAULT_RATE_LIMIT env var (for localnet)
# 1. Add DEFAULT_RATE_LIMIT to config schema
RUN sed -i '/RATE_LIMIT_FILE_URL: z.string().optional(),/a\  DEFAULT_RATE_LIMIT: jsonObjectSchema.optional(),' src/config.js
# 2. Add DEFAULT_RATE_LIMIT to default config
RUN sed -i "/RATE_LIMIT_FILE_URL: process.env.RATE_LIMIT_FILE_URL || '',/a\    DEFAULT_RATE_LIMIT: process.env.DEFAULT_RATE_LIMIT || ''," src/config.js
# 3. Parse DEFAULT_RATE_LIMIT in domain/index.js
RUN sed -i '/^  let rateLimitFile = {}$/c\  // Parse DEFAULT_RATE_LIMIT from environment (JSON string)\n  let rateLimitFile = {}\n  try {\n    if (ctx.DEFAULT_RATE_LIMIT) {\n      rateLimitFile = typeof ctx.DEFAULT_RATE_LIMIT === "object" ? ctx.DEFAULT_RATE_LIMIT : JSON.parse(ctx.DEFAULT_RATE_LIMIT)\n      console.log("Loaded DEFAULT_RATE_LIMIT:", rateLimitFile)\n    }\n  } catch (e) {\n    console.error("Failed to parse DEFAULT_RATE_LIMIT:", e)\n  }' src/domain/index.js

# Patch MU to skip waiting for CU results (for fast localnet testing)
# This makes ao.message() return immediately (~100ms) instead of waiting for CU (~60s)
# Trade-off: Messages may not be fully processed when ao.message() returns
RUN sed -i 's/&no-busy=1//g' src/domain/clients/cu.js

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
