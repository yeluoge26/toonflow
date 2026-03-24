import express from "express";
import { success, error } from "@/lib/responseFormat";
import { getModelHealth } from "@/lib/modelRouter";
const router = express.Router();

export default router.post("/", async (req, res) => {
  try {
    const health = await getModelHealth();
    res.status(200).send(success(health));
  } catch (err: any) {
    res.status(500).send(error(err.message));
  }
});
