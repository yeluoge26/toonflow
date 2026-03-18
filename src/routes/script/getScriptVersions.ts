import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
  }),
  async (req, res) => {
    const { scriptId } = req.body;
    // Get the script's projectId to find all versions
    const script = await u.db("t_script").where("id", scriptId).select("projectId", "outlineId").first();
    if (!script) return res.status(404).send({ message: "剧本不存在" });

    const versions = await u.db("t_script")
      .where("projectId", script.projectId)
      .where("outlineId", script.outlineId)
      .orderBy("version", "desc")
      .select("id", "version", "content", "createTime");

    res.status(200).send(success(versions));
  }
);
