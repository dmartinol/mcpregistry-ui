# Multi-stage Dockerfile for ToolHive Registry UI
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install global dependencies
RUN npm install -g npm@latest

# Copy package.json files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --include=dev

###########################################
# Frontend Build Stage
###########################################
FROM base AS frontend-build

# Copy frontend source
COPY frontend/ ./frontend/

# Build frontend
RUN npm run build --workspace=frontend

###########################################
# Backend Build Stage
###########################################
FROM base AS backend-build

# Copy backend source
COPY backend/ ./backend/

# Build backend
RUN npm run build --workspace=backend

###########################################
# Production Stage
###########################################
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S toolhive -u 1001

# Set working directory
WORKDIR /app

# Copy package.json files for production install
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm ci --only=production --workspace=backend && npm cache clean --force

# Copy built backend
COPY --from=backend-build /app/backend/dist ./backend/dist

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create a simple server to serve both frontend and backend
COPY --chown=toolhive:nodejs <<EOF /app/server.js
const express = require('express');
const path = require('path');
const app = express();

// Import backend routes
const { app: backendApp } = require('./backend/dist/app.js');

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// API routes - backend app already has /api/v1 routes, so mount at root
app.use('/', backendApp);

// Serve React app for all other routes (this should come after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('ToolHive Registry UI running on port ' + PORT);
});
EOF

# Change ownership of the app directory
RUN chown -R toolhive:nodejs /app
USER toolhive

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]