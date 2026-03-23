import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

/**
 * Generate a character reference sheet (front/side/back views)
 * using the character identity data.
 */
export default router.post(
  "/",
  validateFields({
    identityId: z.number(),
    projectId: z.number(),
  }),
  async (req, res) => {
    try {
      const { identityId, projectId } = req.body;

      const identity = await u
        .db("t_character_identity")
        .where("id", identityId)
        .where("projectId", projectId)
        .first();

      if (!identity) {
        return res.status(404).send(error("角色身份不存在"));
      }

      // Build reference sheet prompt from identity data
      const descParts: string[] = [];
      descParts.push(`Character name: ${identity.name}`);
      if (identity.faceDescription) descParts.push(`Face: ${identity.faceDescription}`);
      if (identity.hairStyle) descParts.push(`Hair: ${identity.hairStyle}`);
      if (identity.bodyType) descParts.push(`Body: ${identity.bodyType}`);
      if (identity.clothingDefault) descParts.push(`Clothing: ${identity.clothingDefault}`);
      if (identity.colorPalette) {
        try {
          const palette = JSON.parse(identity.colorPalette);
          descParts.push(`Colors: ${Object.entries(palette).map(([k, v]) => `${k}=${v}`).join(", ")}`);
        } catch {
          descParts.push(`Colors: ${identity.colorPalette}`);
        }
      }

      const characterDesc = descParts.join("\n");

      const prompt = `Generate a character reference sheet with three views (front view, 3/4 side view, back view) of the same character arranged side by side.

${characterDesc}

Requirements:
- Three views must show the EXACT SAME character with identical features, clothing, and colors
- White/light gray background
- Full body shots
- Clear, detailed illustration suitable for production reference
- Label each view: FRONT / SIDE / BACK
- Consistent proportions and style across all three views`;

      const projectInfo = await u.db("t_project").where({ id: projectId }).first();
      const apiConfig = await u.getPromptAi("storyboardImage");

      // Collect existing reference images if available
      const imageBase64: string[] = [];
      if (identity.referenceImagePath) {
        try {
          const buf = await u.oss.getFile(identity.referenceImagePath);
          imageBase64.push(buf.toString("base64"));
        } catch {
          // Skip if reference image not found
        }
      }

      const contentStr = await u.ai.image(
        {
          systemPrompt: "You are generating a character reference sheet for animation production. Maintain strict visual consistency across all views.",
          prompt,
          size: "4K",
          aspectRatio: "16:9",
          imageBase64,
          taskClass: "角色参考图生成",
          name: `参考图-${identity.name}`,
          describe: prompt,
          projectId,
        },
        apiConfig,
      );

      const match = contentStr.match(/base64,([A-Za-z0-9+/=]+)/);
      const base64Str = match?.[1] ?? contentStr;
      const buffer = Buffer.from(base64Str, "base64");

      // Save to OSS and update identity
      const filePath = `character-ref/${projectId}/${identity.name}-${Date.now()}.jpg`;
      await u.oss.writeFile(filePath, buffer);

      await u.db("t_character_identity")
        .where("id", identityId)
        .update({ referenceImagePath: filePath });

      res.status(200).send(success({
        filePath,
        message: "角色参考图生成成功",
      }));
    } catch (err: any) {
      console.error("生成角色参考图失败:", err);
      res.status(500).send(error(err.message));
    }
  },
);
