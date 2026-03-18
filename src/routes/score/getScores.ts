import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number().optional(),
    label: z.enum(["low", "medium", "high"]).optional(),
    limit: z.number().optional().default(50),
  }),
  async (req, res) => {
    let query = u.db("t_scores").orderBy("createdAt", "desc").limit(req.body.limit);
    if (req.body.projectId) query = query.where("projectId", req.body.projectId);
    if (req.body.label) query = query.where("label", req.body.label);

    const scores = await query.select("*");
    const result = scores.map((s: any) => ({
      ...s,
      details: s.details ? JSON.parse(s.details) : {},
    }));

    res.status(200).send(success(result));
  }
);
