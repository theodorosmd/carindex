FROM node:20-bookworm-slim

# Chromium pour Puppeteer (fallback scraping)
RUN apt-get update && apt-get install -y chromium fonts-liberation --no-install-recommends && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 3000
CMD ["node", "src/start.js"]
