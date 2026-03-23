import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { VIRAL_TEMPLATES } from "@/lib/templateEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    category: z.string().optional(),
  }),
  async (req, res) => {
    let templates = VIRAL_TEMPLATES;
    if (req.body.category) {
      templates = templates.filter(t => t.category === req.body.category);
    }
    // Return array directly for admin.html compatibility
    res.status(200).send(success(templates));
  }
);
