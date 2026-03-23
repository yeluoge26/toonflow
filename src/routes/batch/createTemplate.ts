import express from "express";
import { success } from "@/lib/responseFormat";
import { saveTemplate } from "@/lib/batchProductionEngine";
const router = express.Router();
export default router.post("/", async (req, res) => {
  const id = await saveTemplate(req.body);
  res.status(200).send(success({ id, message: "模板已保存" }));
});
