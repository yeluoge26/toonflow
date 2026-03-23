import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

/**
 * Auto-extract character identity from an existing character asset image using AI.
 * Analyzes the image and extracts face features, hair style, clothing, color palette, body type.
 */
export default router.post(
  "/",
  validateFields({
    assetsId: z.number(),
    projectId: z.number(),
  }),
  async (req, res) => {
    try {
      const { assetsId, projectId } = req.body;

      // Get the asset and its image
      const asset = await u
        .db("t_assets")
        .where("id", assetsId)
        .where("projectId", projectId)
        .first();

      if (!asset) {
        return res.status(404).send(error("资产不存在"));
      }

      // Get image file path — from t_image or t_assets.filePath
      let imagePath = asset.filePath;
      if (!imagePath) {
        const image = await u.db("t_image").where("assetsId", assetsId).first();
        imagePath = image?.filePath;
      }

      if (!imagePath) {
        return res.status(400).send(error("该资产没有关联图片"));
      }

      // Load image as base64 for AI analysis
      let imageBase64: string;
      try {
        const buf = await u.oss.getFile(imagePath);
        imageBase64 = buf.toString("base64");
      } catch {
        return res.status(400).send(error("无法加载资产图片"));
      }

      const apiConfig = await u.getPromptAi("storyboardAgent");

      // Use AI to extract character identity from image
      const result = await u.ai.text.invoke(
        {
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `请仔细分析这张角色图片，提取以下角色身份信息。请用中文描述，尽可能详细和精确，以便后续保持角色一致性。

请提取：
1. 面部特征（faceDescription）：面型、五官特征、肤色、特殊标记（痣、疤痕等）
2. 发型（hairStyle）：发长、发色、发型细节（是否扎发、发饰等）
3. 体型（bodyType）：身材比例、大致身高感、体态
4. 服装（clothingDefault）：详细的服装描述，包括款式、材质感、层次
5. 色彩调色板（colorPalette）：角色主要颜色的十六进制色值

角色名称：${asset.name || "未知"}
角色描述：${asset.intro || "无"}`,
                },
                {
                  type: "image",
                  image: imageBase64,
                },
              ],
            },
          ],
          output: {
            faceDescription: z.string().describe("面部特征的详细描述"),
            hairStyle: z.string().describe("发型的详细描述"),
            bodyType: z.string().describe("体型的描述"),
            clothingDefault: z.string().describe("默认服装的详细描述"),
            colorPalette: z.object({
              primary: z.string().describe("主色调十六进制色值"),
              secondary: z.string().describe("次要色调十六进制色值"),
              accent: z.string().describe("点缀色十六进制色值"),
              skin: z.string().describe("肤色十六进制色值"),
              hair: z.string().describe("发色十六进制色值"),
            }).describe("角色色彩调色板"),
          },
        },
        apiConfig,
      );

      // Check if identity already exists for this asset
      const existing = await u
        .db("t_character_identity")
        .where("assetsId", assetsId)
        .where("projectId", projectId)
        .first();

      const identityData = {
        projectId,
        assetsId,
        name: asset.name || "未知角色",
        faceDescription: result.faceDescription || "",
        hairStyle: result.hairStyle || "",
        bodyType: result.bodyType || "",
        clothingDefault: result.clothingDefault || "",
        colorPalette: JSON.stringify(result.colorPalette || {}),
        referenceImagePath: imagePath,
        consistencySeed: Math.floor(Math.random() * 999999) + 100000,
        ipAdapterWeight: 0.7,
      };

      let identityId: number;
      if (existing) {
        await u.db("t_character_identity").where("id", existing.id).update({
          ...identityData,
          updatedAt: Date.now(),
        });
        identityId = existing.id as number;
      } else {
        const [newId] = await u.db("t_character_identity").insert({
          ...identityData,
          createdAt: Date.now(),
        });
        identityId = newId;
      }

      const savedIdentity = await u.db("t_character_identity").where("id", identityId).first();

      res.status(200).send(success({
        identity: savedIdentity,
        message: "角色身份提取成功",
      }));
    } catch (err: any) {
      console.error("角色身份提取失败:", err);
      res.status(500).send(error(err.message));
    }
  },
);
