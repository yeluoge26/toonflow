import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({ id: z.number() }),
  async (req, res) => {
    await u.db("t_character").where("id", req.body.id).delete();
    res.status(200).send(success({ message: "角色删除成功" }));
  },
);
