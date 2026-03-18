import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Get available templates from marketplace
export default router.post(
  "/",
  validateFields({
    type: z.enum(["script", "storyboard", "style", "character"]).optional(),
    category: z.string().optional(),
    keyword: z.string().optional(),
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(20),
  }),
  async (req, res) => {
    const { type, category, keyword, page, pageSize } = req.body;

    let query = u.db("t_template");
    let countQuery = u.db("t_template");

    if (type) {
      query = query.where("type", type);
      countQuery = countQuery.where("type", type);
    }
    if (category) {
      query = query.where("category", category);
      countQuery = countQuery.where("category", category);
    }
    if (keyword) {
      query = query.where("name", "like", `%${keyword}%`);
      countQuery = countQuery.where("name", "like", `%${keyword}%`);
    }

    const totalResult = await countQuery.count("* as c").first();
    const total = Number(totalResult?.c) || 0;

    const templates = await query
      .orderBy("usageCount", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .select("*");

    const result = templates.map((t: any) => ({
      ...t,
      structure: t.structure ? JSON.parse(t.structure) : {},
      tags: t.tags ? JSON.parse(t.tags) : [],
      variables: t.variables ? JSON.parse(t.variables) : {},
    }));

    res.status(200).send(
      success({
        templates: result,
        total,
        page,
        pageSize,
      }),
    );
  },
);
