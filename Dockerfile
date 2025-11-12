# Multi-stage build supporting development mode with HMR
FROM node:20

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace package files
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/
COPY reverse-proxy/package*.json ./reverse-proxy/
COPY claude-code-api/package*.json ./claude-code-api/

# Install all dependencies (including dev dependencies for HMR)
RUN npm install

# Copy all source code
COPY frontend ./frontend
COPY backend ./backend
COPY reverse-proxy ./reverse-proxy
COPY claude-code-api ./claude-code-api

# Copy startup script
COPY start-services.sh ./start-services.sh
RUN chmod +x ./start-services.sh

# Set default environment variables
# Note: PORT is NOT set here to avoid conflicts
# - Backend defaults to 3001 (process.env.PORT || 3001)
# - Reverse proxy defaults to 3000 (process.env.PORT || 3000)
ENV BACKEND_URL=http://localhost:3001
ENV FRONTEND_URL=http://localhost:5173

# Expose ports
EXPOSE 3000
EXPOSE 3001
EXPOSE 5173
EXPOSE 3002

# Start all four services in development mode
CMD ["./start-services.sh"]
