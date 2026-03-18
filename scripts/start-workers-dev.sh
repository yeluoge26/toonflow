#!/bin/bash
# Dev mode: run workers with tsx (TypeScript direct execution)

echo "🔧 Starting ToonFlow Workers (dev mode)..."

# Check Redis
if ! redis-cli ping > /dev/null 2>&1; then
  echo "⚠️  Redis not available. Workers will log errors but batch engine has SQLite fallback."
fi

# Start workers
npx tsx src/workers/script.worker.ts &
npx tsx src/workers/storyboard.worker.ts &
npx tsx src/workers/image.worker.ts &
npx tsx src/workers/video.worker.ts &
npx tsx src/workers/voice.worker.ts &
npx tsx src/workers/score.worker.ts &

echo "✅ All workers started. Press Ctrl+C to stop."
wait
