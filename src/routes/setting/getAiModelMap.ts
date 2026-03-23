import express from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";

const router = express.Router();

export default router.post("/", async (req, res) => {
  const configData = await u
    .db("t_aiModelMap as m")
    .leftJoin("t_config as c1", "m.configId", "c1.id")
    .leftJoin("t_config as c2", "m.configId2", "c2.id")
    .leftJoin("t_config as c3", "m.configId3", "c3.id")
    .select(
      "m.id", "m.name", "m.key",
      "m.configId", "c1.model", "c1.manufacturer",
      "m.configId2", "c2.model as model2", "c2.manufacturer as manufacturer2",
      "m.configId3", "c3.model as model3", "c3.manufacturer as manufacturer3",
    );
  res.status(200).send(success(configData));
});
