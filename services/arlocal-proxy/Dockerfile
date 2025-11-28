FROM node:22-alpine AS runner

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY server.mjs .

ENV DEBUG=arlocal-proxy*
ENV PORT=80

EXPOSE 80

CMD ["node", "server.mjs"]

