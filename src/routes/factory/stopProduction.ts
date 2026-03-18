import express from "express";
import { success } from "@/lib/responseFormat";
import scheduler from "@/lib/scheduler";
const router = express.Router();

export default router.post("/", async (req, res) => {
  scheduler.stop();
  res.status(200).send(success({ message: "生产线已停止" }));
});
