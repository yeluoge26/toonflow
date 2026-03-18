import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Publish a project element as a template
export default router.post(
  "/",
  validateFields({
    type: z.enum(["script", "storyboard", "style", "character"]),
    name: z.string(),
    description: z.string().optional().default(""),
    sourceId: z.number(), // ID of the source element
    projectId: z.number(),
    price: z.number().optional().default(0), // 0 = free
    tags: z.array(z.string()).optional().default([]),
  }),
  async (req, res) => {
    // TODO: Implement when t_template table exists
    res.status(200).send(success({ message: "模板发布功能开发中" }));
  },
);
