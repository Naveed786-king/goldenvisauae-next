# Works on Render, Railway, Fly.io, Coolify, any VPS with Docker.
# Keep /data on a persistent volume: it holds the database and uploads.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* .npmrc ./
RUN npm install --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=file:/data/data.db \
    UPLOAD_DIR=/data/uploads
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000
CMD ["npm", "start"]
