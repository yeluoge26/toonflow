import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { publishTemplate } from "@/lib/commercialEngine";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    name: z.string().min(1),
    category: z.enum(["romance", "suspense", "comedy", "horror", "fantasy"]),
    description: z.string().optional().default(""),
    authorId: z.number(),
    price: z.number().optional().default(0),
    currency: z.enum(["CNY", "USD"]).optional().default("CNY"),
    templateData: z.string().optional().default("{}"),
    thumbnailUrl: z.string().optional(),
    status: z.enum(["draft", "published", "archived"]).optional().default("published"),
  }),
  async (req, res) => {
    try {
      const id = await publishTemplate(req.body);
      res.status(200).send(success({ id, message: "模板发布成功" }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  },
);
