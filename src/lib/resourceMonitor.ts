import os from "os";

interface SystemStats {
  cpu: {
    usage: number;        // percentage 0-100
    cores: number;
    model: string;
  };
  memory: {
    total: number;        // MB
    used: number;
    free: number;
    usagePercent: number;
  };
  process: {
    uptime: number;       // seconds
    memoryUsage: number;  // MB
    pid: number;
  };
  queues: Record<string, any>;
  cache: Record<string, any>;
}

class ResourceMonitor {
  private lastCpuInfo: { idle: number; total: number } | null = null;

  // Get CPU usage percentage
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }

    if (this.lastCpuInfo) {
      const idleDiff = totalIdle - this.lastCpuInfo.idle;
      const totalDiff = totalTick - this.lastCpuInfo.total;
      const usage = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;
      this.lastCpuInfo = { idle: totalIdle, total: totalTick };
      return usage;
    }

    this.lastCpuInfo = { idle: totalIdle, total: totalTick };
    return 0;
  }

  // Get system stats
  async getStats(): Promise<SystemStats> {
    const cpus = os.cpus();
    const totalMem = Math.round(os.totalmem() / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024);
    const usedMem = totalMem - freeMem;
    const processMemory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    // Get queue stats
    let queueStats = {};
    try {
      const { QueueService } = await import("@/services/queue.service");
      queueStats = await QueueService.getQueueStats();
    } catch {}

    // Get cache stats
    let cacheStats = {};
    try {
      const cache = (await import("./cache")).default;
      cacheStats = await cache.getStats();
    } catch {}

    return {
      cpu: {
        usage: this.getCpuUsage(),
        cores: cpus.length,
        model: cpus[0]?.model || "unknown",
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: Math.round((usedMem / totalMem) * 100),
      },
      process: {
        uptime: Math.round(process.uptime()),
        memoryUsage: processMemory,
        pid: process.pid,
      },
      queues: queueStats,
      cache: cacheStats,
    };
  }

  // Check if system is overloaded
  async isOverloaded(): Promise<{ overloaded: boolean; reason?: string }> {
    const stats = await this.getStats();

    if (stats.memory.usagePercent > 90) {
      return { overloaded: true, reason: `内存使用率 ${stats.memory.usagePercent}% > 90%` };
    }
    if (stats.cpu.usage > 85) {
      return { overloaded: true, reason: `CPU使用率 ${stats.cpu.usage}% > 85%` };
    }

    // Check queue backlog
    const totalWaiting = Object.values(stats.queues as Record<string, any>)
      .reduce((sum: number, q: any) => sum + (q?.waiting || 0), 0);
    if (totalWaiting > 100) {
      return { overloaded: true, reason: `队列积压 ${totalWaiting} 任务` };
    }

    return { overloaded: false };
  }

  // Get cost tracker summary
  async getCostSummary() {
    try {
      const costTracker = (await import("./costControl")).default;
      return costTracker.getTodaySummary();
    } catch {
      return { totalCost: 0, budget: 50, remaining: 50 };
    }
  }
}

const monitor = new ResourceMonitor();
export default monitor;
