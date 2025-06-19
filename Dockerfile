# Dockerfile

    FROM node:18-alpine AS builder

    # Set the working directory in the container
    WORKDIR /app
    
    # Copy package.json and package-lock.json first to leverage Docker cache
    COPY package*.json ./
    RUN npm ci
    COPY . .
    # Compile TypeScript to JavaScript
    RUN npm run build

    FROM node:18-alpine

    WORKDIR /app
    # Copy package.json to install only production dependencies
    COPY package*.json ./
    RUN npm ci --only=production
    RUN mkdir -p /docker-entrypoint-initdb.d/
    
    # Copy the compiled code from the 'builder' stage
    COPY --from=builder /app/dist ./dist
    
    # Expose the port the app runs on
    EXPOSE 3000
    
    # Command to run the application
    CMD ["node", "dist/index.js"]