import { Queue, QueueEvents } from "bullmq";
import { connection } from "./connection";

// Pipeline step queues - each step has its own queue for independent scaling
export const scriptQueue = new Queue("script", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const storyboardQueue = new Queue("storyboard", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const imageQueue = new Queue("image", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const videoQueue = new Queue("video", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 15000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const voiceQueue = new Queue("voice", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const scoreQueue = new Queue("score", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

// Get all queues for monitoring
export const allQueues = {
  script: scriptQueue,
  storyboard: storyboardQueue,
  image: imageQueue,
  video: videoQueue,
  voice: voiceQueue,
  score: scoreQueue,
};

export type QueueStep = keyof typeof allQueues;
