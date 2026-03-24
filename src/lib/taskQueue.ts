import u from "@/utils";

interface TaskPayload {
  type: "video" | "image" | "audio" | "script";
  priority?: number;
  maxAttempts?: number;
  projectId?: number;
  scriptId?: number;
  data: Record<string, any>;
}

interface TaskResult {
  id: number;
  type: string;
  status: string;
  progress: number;
  result?: any;
  errorReason?: string;
}

class TaskQueue {
  private running: Map<number, AbortController> = new Map();
  private maxConcurrent: number = 3;
  private handlers: Map<string, (payload: any, onProgress: (p: number) => void, signal: AbortSignal) => Promise<any>> = new Map();
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  // Register a handler for a task type
  registerHandler(type: string, handler: (payload: any, onProgress: (p: number) => void, signal: AbortSignal) => Promise<any>) {
    this.handlers.set(type, handler);
  }

  // Add a task to the queue
  async enqueue(task: TaskPayload): Promise<number> {
    const [id] = await u.db("t_taskQueue").insert({
      type: task.type,
      status: "pending",
      priority: task.priority || 0,
      payload: JSON.stringify(task.data),
      maxAttempts: task.maxAttempts || 3,
      projectId: task.projectId,
      scriptId: task.scriptId,
      attempts: 0,
      progress: 0,
      createdAt: Date.now(),
    });
    this.processNext();
    return id;
  }

  // Get task status
  async getTask(id: number): Promise<TaskResult | null> {
    const task = await u.db("t_taskQueue").where("id", id).first();
    if (!task) return null;
    return {
      id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      result: task.result ? JSON.parse(task.result) : null,
      errorReason: task.errorReason,
    };
  }

  // Get all tasks for a project
  async getProjectTasks(projectId: number, type?: string): Promise<TaskResult[]> {
    let query = u.db("t_taskQueue").where("projectId", projectId);
    if (type) query = query.where("type", type);
    const tasks = await query.orderBy("createdAt", "desc").select("*");
    return tasks.map((t: any) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      progress: t.progress,
      result: t.result ? JSON.parse(t.result) : null,
      errorReason: t.errorReason,
    }));
  }

  // Cancel a task
  async cancel(id: number): Promise<boolean> {
    const controller = this.running.get(id);
    if (controller) {
      controller.abort();
      this.running.delete(id);
    }
    await u.db("t_taskQueue").where("id", id).whereIn("status", ["pending", "running"]).update({ status: "cancelled" });
    return true;
  }

  // Process next available task
  private async processNext() {
    if (this.running.size >= this.maxConcurrent) return;

    const task = await u.db("t_taskQueue")
      .where("status", "pending")
      .where("attempts", "<", u.db.raw("maxAttempts"))
      .orderBy("priority", "desc")
      .orderBy("createdAt", "asc")
      .first();

    if (!task) return;

    const handler = this.handlers.get(task.type);
    if (!handler) {
      await u.db("t_taskQueue").where("id", task.id).update({
        status: "failed",
        errorReason: `No handler registered for type: ${task.type}`,
      });
      return;
    }

    const controller = new AbortController();
    this.running.set(task.id, controller);

    // Mark as running
    await u.db("t_taskQueue").where("id", task.id).update({
      status: "running",
      startedAt: Date.now(),
      attempts: task.attempts + 1,
    });

    // Execute with retry logic
    this.executeTask(task, handler, controller).catch((err: any) => { console.error("[background]", err.message); });
  }

  private async executeTask(
    task: any,
    handler: (payload: any, onProgress: (p: number) => void, signal: AbortSignal) => Promise<any>,
    controller: AbortController
  ) {
    try {
      const payload = JSON.parse(task.payload);
      const onProgress = async (progress: number) => {
        await u.db("t_taskQueue").where("id", task.id).update({ progress });
      };

      const result = await handler(payload, onProgress, controller.signal);

      await u.db("t_taskQueue").where("id", task.id).update({
        status: "completed",
        result: JSON.stringify(result),
        progress: 100,
        completedAt: Date.now(),
      });
    } catch (err: any) {
      if (controller.signal.aborted) return;

      const attempts = task.attempts + 1;
      const maxAttempts = task.maxAttempts || 3;

      if (attempts < maxAttempts) {
        // Exponential backoff retry
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
        await u.db("t_taskQueue").where("id", task.id).update({
          status: "pending",
          errorReason: err.message || "Unknown error",
        });
        setTimeout(() => this.processNext(), delay);
      } else {
        await u.db("t_taskQueue").where("id", task.id).update({
          status: "failed",
          errorReason: err.message || "Unknown error",
          completedAt: Date.now(),
        });
      }
    } finally {
      this.running.delete(task.id);
      // Process next task
      setTimeout(() => this.processNext(), 100);
    }
  }

  // Start polling for stuck tasks (cleanup)
  startPolling(intervalMs: number = 60000) {
    this.pollInterval = setInterval(async () => {
      // Reset tasks stuck in 'running' for > 10 minutes
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      await u.db("t_taskQueue")
        .where("status", "running")
        .where("startedAt", "<", tenMinAgo)
        .update({ status: "pending" });
      this.processNext();
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

const taskQueue = new TaskQueue();
export default taskQueue;
