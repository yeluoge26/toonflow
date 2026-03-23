import express from "express";
import { success } from "@/lib/responseFormat";
import monitor from "@/lib/resourceMonitor";
const router = express.Router();

export default router.post("/", async (req, res) => {
  const [stats, overload, cost] = await Promise.all([
    monitor.getStats(),
    monitor.isOverloaded(),
    monitor.getCostSummary(),
  ]);

  // Flatten for admin.html compatibility
  res.status(200).send(success({
    cpu: stats.cpu?.usage || 0,
    memory: stats.memory?.usagePercent || 0,
    gpu: (stats as any).gpu?.usage || 0,
    gpuName: (stats as any).gpu?.name || "N/A",
    gpuTemp: (stats as any).gpu?.temperature || 0,
    gpuMemory: (stats as any).gpu?.memUsage || 0,
    uptime: stats.process?.uptime || 0,
    redis: stats.queues && Object.keys(stats.queues).length > 0 ? 'connected' : 'disconnected',
    queue: stats.queues && Object.keys(stats.queues).length > 0 ? 'active' : 'stopped',
    overloaded: overload,
    cost,
    cpuDetail: stats.cpu,
    memoryDetail: stats.memory,
    processDetail: stats.process,
    queues: stats.queues,
    cache: stats.cache,
  }));
});
