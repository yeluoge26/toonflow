import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// Stub for future TTS integration - binds a voice ID to a character
export default router.post(
  "/",
  validateFields({
    assetsId: z.number(),
    voiceId: z.string(),
  }),
  async (req, res) => {
    const { assetsId, voiceId } = req.body;
    const asset = await u
      .db("t_assets")
      .where("id", assetsId)
      .where("type", "role")
      .first();
    if (!asset) return res.status(404).send(error("角色不存在"));

    // Store voiceId in the asset's remark field as JSON metadata
    let metadata: Record<string, any> = {};
    try {
      if (asset.remark) {
        metadata = JSON.parse(asset.remark);
      }
    } catch (e) {
      // If remark is not valid JSON, start fresh
    }
    metadata.voiceId = voiceId;

    await u.db("t_assets").where("id", assetsId).update({
      remark: JSON.stringify(metadata),
    });

    res.status(200).send(success({ message: "声音绑定成功" }));
  },
);
