import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { VIRAL_TEMPLATES } from "@/lib/viralEngine";
import u from "@/utils";
const router = express.Router();

// 获取爆款模板列表（内置 + 自定义）
export default router.post(
  "/",
  validateFields({}),
  async (req, res) => {
    // Built-in templates
    const builtIn = Object.entries(VIRAL_TEMPLATES).map(([key, value]) => ({
      key,
      ...value,
      source: "builtin",
    }));

    // Custom templates from DB
    let custom: any[] = [];
    try {
      const rows = await u.db("t_viral_template").select("*").orderBy("createdAt", "desc");
      custom = rows.map((r: any) => {
        let structure;
        try { structure = JSON.parse(r.structure); } catch { structure = {}; }
        return {
          key: `custom_${r.id}`,
          id: r.id,
          name: r.name,
          category: r.category,
          ...structure,
          source: "custom",
        };
      });
    } catch {
      // Table may not exist yet
    }

    res.status(200).send(success([...builtIn, ...custom]));
  },
);
