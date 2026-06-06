# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production

# Update Alpine packages to patch vulnerabilities
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Copy built app to nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Change ownership to nginx user for security
RUN chown -R nginx:nginx /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose default web port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
