import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Get top performing templates by score or usage
export default router.post(
  "/",
  validateFields({
    sortBy: z.enum(["avgScore", "usageCount", "successRate"]).optional().default("avgScore"),
    category: z.string().optional(),
    limit: z.number().optional().default(20),
  }),
  async (req, res) => {
    let query = u.db("t_template")
      .orderBy(req.body.sortBy, "desc")
      .limit(req.body.limit);

    if (req.body.category) query = query.where("category", req.body.category);

    const templates = await query.select("*");
    const result = templates.map((t: any) => ({
      ...t,
      structure: t.structure ? JSON.parse(t.structure) : {},
      tags: t.tags ? JSON.parse(t.tags) : [],
      variables: t.variables ? JSON.parse(t.variables) : {},
    }));

    res.status(200).send(success(result));
  }
);
