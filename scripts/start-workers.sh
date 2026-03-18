#!/bin/bash
# ToonFlow Worker Startup Script
# Requires: Redis running, Node.js installed

echo "🚀 Starting ToonFlow Workers..."

# Check Redis
if ! redis-cli ping > /dev/null 2>&1; then
  echo "⚠️  Redis not running. Starting with docker..."
  docker run -d --name toonflow-redis -p 6379:6379 redis:7-alpine
  sleep 2
fi

echo "✅ Redis connected"

# Build if needed
if [ ! -d "build/workers" ]; then
  echo "📦 Building workers..."
  npm run build
fi

# Start with PM2
if command -v pm2 &> /dev/null; then
  echo "🔧 Starting with PM2..."
  pm2 start ecosystem.config.js
  pm2 logs
else
  echo "🔧 Starting workers directly..."
  # Start each worker in background
  node build/workers/script.worker.js &
  node build/workers/storyboard.worker.js &
  node build/workers/image.worker.js &
  node build/workers/video.worker.js &
  node build/workers/voice.worker.js &
  node build/workers/score.worker.js &

  # Start API
  node build/app.js
fi
