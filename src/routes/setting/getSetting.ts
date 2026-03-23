import express from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
const router = express.Router();

export default router.post("/", async (req, res) => {
  const userId = 1;
  // Return ALL configs (including video) with id for model selection
  const configData = await u.db("t_config").where("userId", userId).select("id", "type", "model", "manufacturer", "baseUrl", "modelType", "createTime");

  res.status(200).send(success(configData));
});
