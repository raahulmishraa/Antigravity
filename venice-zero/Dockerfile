# Multi-stage Dockerfile for Venice Zero
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY server.js ./
COPY public ./public

EXPOSE 4000

CMD ["node", "server.js"]
