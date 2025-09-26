FROM node:22-alpine

# Set workdir
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
# Enable corepack for pnpm and install deps using the lockfile
RUN corepack enable \
  && pnpm install --frozen-lockfile --prod

# Copy source
COPY sdmapi.js ./

# Set timezone to Asia/Jakarta for local time logs
RUN apk add --no-cache tzdata \
  && cp /usr/share/zoneinfo/Asia/Jakarta /etc/localtime \
  && echo "Asia/Jakarta" > /etc/timezone \
  && apk del tzdata || true

# Run as non-root
RUN addgroup -S app && adduser -S app -G app
USER app

CMD ["node", "sdmapi.js", "--daemon"]


