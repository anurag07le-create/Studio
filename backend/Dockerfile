FROM node:20-bullseye

# Install FFmpeg and Python (for build dependencies if needed)
RUN apt-get update && apt-get install -y ffmpeg python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies (ensure better-sqlite3 triggers a build if needed)
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 3005

# Define environment variables (can be overridden at runtime)
ENV PORT=3005
ENV NODE_ENV=production

# Start the application
CMD ["node", "src/app.js"]
