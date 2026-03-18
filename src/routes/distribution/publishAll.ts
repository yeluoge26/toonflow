import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { publishToAll } from "@/utils/distribution";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    videoPath: z.string(),
    title: z.string(),
    description: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
    platforms: z.array(z.string()),
    projectId: z.number(),
    coverImage: z.string().optional(),
  }),
  async (req, res) => {
    try {
      const { platforms, ...request } = req.body;
      const results = await publishToAll(request, platforms);

      const succeeded = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.status(200).send(success({
        total: platforms.length,
        succeeded: succeeded.length,
        failed: failed.length,
        results,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
