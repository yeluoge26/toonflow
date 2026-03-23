import express from "express";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { parseDSLFromText, validateDSL, dslToText, buildImagePromptFromDSL, buildVideoPromptFromDSL } from "@/lib/storyboardDSL";

const router = express.Router();

// 解析分镜DSL文本
export default router.post(
  "/",
  validateFields({
    text: z.string().min(1),
    validate: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
      const { text, validate: shouldValidate } = req.body;

      // Parse DSL from text
      const dsl = parseDSLFromText(text);

      // Optionally validate
      let validation = undefined;
      if (shouldValidate !== false) {
        validation = validateDSL(dsl);
      }

      // Generate the text representation back
      const textOutput = dslToText(dsl);

      res.status(200).send(
        success({
          dsl,
          validation,
          text: textOutput,
        })
      );
    } catch (err: any) {
      res.status(400).send(error(`DSL解析失败: ${err.message}`));
    }
  }
);
