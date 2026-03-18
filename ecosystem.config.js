module.exports = {
  apps: [
    // Main API server
    {
      name: "toonflow-api",
      script: "build/app.js",
      instances: 1,
      env: {
        NODE_ENV: "prod",
        PORT: 60000,
      },
    },
    // Workers - each runs as a separate process
    {
      name: "worker-script",
      script: "build/workers/script.worker.js",
      instances: 2,  // 2 script workers
      env: {
        NODE_ENV: "prod",
      },
    },
    {
      name: "worker-storyboard",
      script: "build/workers/storyboard.worker.js",
      instances: 2,
      env: {
        NODE_ENV: "prod",
      },
    },
    {
      name: "worker-image",
      script: "build/workers/image.worker.js",
      instances: 1,  // GPU-bound, fewer instances
      env: {
        NODE_ENV: "prod",
      },
    },
    {
      name: "worker-video",
      script: "build/workers/video.worker.js",
      instances: 1,  // GPU-bound, fewer instances
      env: {
        NODE_ENV: "prod",
      },
    },
    {
      name: "worker-voice",
      script: "build/workers/voice.worker.js",
      instances: 2,
      env: {
        NODE_ENV: "prod",
      },
    },
    {
      name: "worker-score",
      script: "build/workers/score.worker.js",
      instances: 2,
      env: {
        NODE_ENV: "prod",
      },
    },
  ],
};
