# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the frontend and backend
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy build artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create directory for persistent local database
RUN mkdir -p server/data

# Expose port
EXPOSE 3000

# Run the server
CMD ["node", "dist/server.cjs"]
