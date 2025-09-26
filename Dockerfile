FROM node:18-alpine

# Set workdir
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev

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


