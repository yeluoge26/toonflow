import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
  }),
  async (req, res) => {
    const { scriptId } = req.body;
    const script = await u.db("t_script").where("id", scriptId).first();
    if (!script) return res.status(404).send(error("剧本不存在"));

    // Get current max version
    const maxVersion = await u.db("t_script")
      .where("projectId", script.projectId)
      .where("outlineId", script.outlineId)
      .max("version as maxVer")
      .first();

    const newVersion = (Number((maxVersion as any)?.maxVer) || 0) + 1;

    // Insert new version as a copy
    const [newId] = await u.db("t_script").insert({
      projectId: script.projectId,
      outlineId: script.outlineId,
      content: script.content,
      version: newVersion,
      createTime: Date.now(),
    } as any);

    res.status(200).send(success({ id: newId, version: newVersion }));
  }
);
