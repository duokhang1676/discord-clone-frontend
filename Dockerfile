FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY server.js ./

# Expose port (Railway sets PORT env var)
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
