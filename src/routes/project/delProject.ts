import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

// 删除项目
export default router.post(
  "/",
  validateFields({
    id: z.number(),
  }),
  async (req, res) => {
    const { id } = req.body;

    try {
      const safeDelete = async (trx: any, table: string, where: Record<string, any>) => {
        try { await trx(table).where(where).delete(); } catch {}
      };
      const safeDeleteIn = async (trx: any, table: string, col: string, ids: number[]) => {
        try { if (ids.length > 0) await trx(table).whereIn(col, ids).delete(); } catch {}
      };

      const scriptData = await u.db("t_script").where("projectId", id).select("id").catch(() => []);
      const scriptIds = scriptData.map((item: any) => item.id);

      const assetsData = await u.db("t_assets").where("projectId", id).select("id").catch(() => []);
      const assetsIds = assetsData.map((item: any) => item.id);

      await u.db.transaction(async (trx) => {
        await safeDelete(trx, "t_project", { id });
        await safeDelete(trx, "t_novel", { projectId: id });
        await safeDelete(trx, "t_storyline", { projectId: id });
        await safeDelete(trx, "t_outline", { projectId: id });
        await safeDelete(trx, "t_script", { projectId: id });
        await safeDelete(trx, "t_assets", { projectId: id });
        await safeDelete(trx, "t_chatHistory", { projectId: id });

        try {
          const q = trx("t_image").where("projectId", id);
          if (assetsIds.length > 0) q.orWhereIn("assetsId", assetsIds);
          if (scriptIds.length > 0) q.orWhereIn("scriptId", scriptIds);
          await q.delete();
        } catch {}

        await safeDeleteIn(trx, "t_video", "scriptId", scriptIds);
      });

      try {
        await u.oss.deleteDirectory(`${id}/`);
      } catch {}

      res.status(200).send(success({ message: "删除项目成功" }));
    } catch (err: any) {
      res.status(500).send({ message: err.message || "删除失败" });
    }
  },
);
