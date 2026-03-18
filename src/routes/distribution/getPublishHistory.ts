import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Get publish history for a project
export default router.post(
  "/",
  validateFields({
    projectId: z.number().optional(),
    platform: z.string().optional(),
    limit: z.number().optional().default(50),
  }),
  async (req, res) => {
    let query = u.db("t_metrics").orderBy("createdAt", "desc").limit(req.body.limit);
    if (req.body.projectId) query = query.where("projectId", req.body.projectId);
    if (req.body.platform) query = query.where("platform", req.body.platform);

    const history = await query.select("*");
    res.status(200).send(success({
      history,
      total: history.length,
    }));
  }
);
