


# https://github.com/zricethezav/gitleaks/releases/download/v1.24.0/gitleaks-linux-amd64

# Build

FROM node:lts-jessie AS builder
WORKDIR /app

ENV NPM_CONFIG_LOGLEVEL warn

COPY package*.json ./
RUN npm ci
COPY . /app

USER node

# Release

FROM node:lts-jessie AS release
WORKDIR /app

ENV NPM_CONFIG_LOGLEVEL warn

COPY --from=builder /app/package*.json ./
RUN npm prune --production 
RUN curl -o /usr/bin/gitleaks -LOs https://github.com/zricethezav/gitleaks/releases/download/v1.24.0/gitleaks-linux-amd64 && chmod +x /usr/bin/gitleaks

COPY --from=builder /app .
USER node

CMD chamber exec secrets_probot_scanner -- npm start


