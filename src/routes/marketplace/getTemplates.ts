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
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(20),
  }),
  async (req, res) => {
    // TODO: When t_template table is created, query from it
    // For now, return empty list
    res.status(200).send(
      success({
        templates: [],
        total: 0,
        page: req.body.page,
        pageSize: req.body.pageSize,
      }),
    );
  },
);
