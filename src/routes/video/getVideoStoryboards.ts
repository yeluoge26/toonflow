import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();
interface Storyboard {
  id: number;
  storyboardName: string;
  filePath: string;
  prompt: string;
  videoPrompt: string;
  duration: number;
}
interface StoryboardList {
  id: number;
  scriptName: string;
  storyboard: Storyboard[];
}
interface RawRow {
  scriptId: number;
  scriptName: string;
  storyboardId: number | null;
  storyboardName: string | null;
  filePath: string | null;
  prompt: string | null;
  videoPrompt: string | null;
  duration: number | null;
}

// 获取视频分镜
export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
  }),
  async (req, res) => {
    const { scriptId } = req.body;

    const rawData: RawRow[] = await u
      .db("t_script")
      .leftJoin("t_assets", "t_assets.scriptId", "t_script.id")
      .where("t_script.id", scriptId)
      .where("t_assets.type", "分镜")
      .select([
        "t_script.id as scriptId",
        "t_script.name as scriptName",
        "t_assets.id as storyboardId",
        "t_assets.name as storyboardName",
        "t_assets.filePath",
        "t_assets.videoPrompt",
        "t_assets.prompt",
        "t_assets.duration",
      ]);

    // 分组整理
    const result: StoryboardList[] = [];
    const map = new Map<number, StoryboardList>();

    // Collect rows that need file URL resolution
    const rowsWithStoryboard = rawData.filter((row) => row.storyboardId);
    const fileUrls = await Promise.all(
      rowsWithStoryboard.map((row) => u.oss.getFileUrl(row.filePath ?? ""))
    );

    for (const row of rawData) {
      if (!map.has(row.scriptId)) {
        const script: StoryboardList = {
          id: row.scriptId,
          scriptName: row.scriptName,
          storyboard: [],
        };
        map.set(row.scriptId, script);
        result.push(script);
      }
      if (row.storyboardId) {
        const urlIndex = rowsWithStoryboard.indexOf(row);
        map.get(row.scriptId)!.storyboard.push({
          id: row.storyboardId,
          storyboardName: row.storyboardName ?? "",
          filePath: fileUrls[urlIndex],
          prompt: row.prompt ?? "",
          videoPrompt: row.videoPrompt ?? "",
          duration: row.duration ?? 0,
        });
      }
    }
    res.status(200).send(success(result));
  }
);
