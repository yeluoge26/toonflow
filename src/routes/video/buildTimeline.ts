import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { buildTimelineFromShots, suggestTransitions, calculateTotalDuration } from "@/utils/ai/video/keyframe";
const router = express.Router();

// Build a video timeline from storyboard data
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId } = req.body;

      // Get all storyboard images for this script
      const images = await u.db("t_image")
        .where("scriptId", scriptId)
        .where("projectId", projectId)
        .select("filePath", "videoPrompt", "shotIndex");

      if (images.length === 0) {
        return res.status(400).send(error("未找到分镜图片"));
      }

      // Build shots data
      const shots = images.map((img: any) => ({
        imageUrl: img.filePath,
        videoPrompt: img.videoPrompt || "",
        duration: 3,  // default 3 seconds per shot
        cells: [{ src: img.filePath }],
      }));

      // Build and optimize timeline
      let keyframes = buildTimelineFromShots(shots);
      keyframes = suggestTransitions(keyframes);
      const totalDuration = calculateTotalDuration(keyframes);

      res.status(200).send(success({
        projectId,
        scriptId,
        totalDuration,
        keyframes,
        shotCount: keyframes.length,
      }));
    } catch (err: any) {
      res.status(500).send(error(err.message));
    }
  }
);
