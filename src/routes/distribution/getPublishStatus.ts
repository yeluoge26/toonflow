import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number().optional(),
    platform: z.string().optional(),
    status: z.string().optional(),
    limit: z.number().optional().default(50),
  }),
  async (req, res) => {
    try {
      let query = u.db("t_distribution_task")
        .leftJoin("t_distribution_account", "t_distribution_task.accountId", "t_distribution_account.id")
        .select(
          "t_distribution_task.*",
          "t_distribution_account.username as accountName",
          "t_distribution_account.platform as accountPlatform",
        )
        .orderBy("t_distribution_task.createdAt", "desc")
        .limit(req.body.limit);

      if (req.body.projectId) query = query.where("t_distribution_task.projectId", req.body.projectId);
      if (req.body.platform) query = query.where("t_distribution_task.platform", req.body.platform);
      if (req.body.status) query = query.where("t_distribution_task.status", req.body.status);

      const tasks = await query;

      // Parse tags JSON for each task
      const result = tasks.map((t: any) => ({
        ...t,
        tags: (() => { try { return JSON.parse(t.tags); } catch { return []; } })(),
      }));

      res.status(200).send(success(result));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
