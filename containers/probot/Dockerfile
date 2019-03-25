# Build

FROM node:lts-jessie AS builder
WORKDIR /app

ENV NPM_CONFIG_LOGLEVEL warn

COPY package*.json ./
RUN npm ci
COPY . /app

USER node

# Release

FROM node:lts-jessie  AS release
WORKDIR /app

ENV NPM_CONFIG_LOGLEVEL warn

COPY --from=builder /app/package*.json ./
RUN npm prune --production 
RUN curl -o /usr/bin/chamber -LOs https://github.com/segmentio/chamber/releases/download/v2.3.2/chamber-v2.3.2-linux-amd64 && chmod +x /usr/bin/chamber

COPY --from=builder /app .
USER node

CMD chamber exec secrets_probot_scanner -- npm start