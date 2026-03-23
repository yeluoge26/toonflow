import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { saveAntiDriftConfig, AntiDriftConfig } from "@/lib/antiDrift";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    lightingLock: z.object({
      enabled: z.boolean(),
      globalLighting: z.string(),
      timeOfDay: z.string(),
      lightSource: z.string(),
      shadowDirection: z.string(),
      colorTemperature: z.string(),
    }).optional(),
    characterEntryRule: z.object({
      enabled: z.boolean(),
      maxCharactersPerShot: z.number(),
      allowedCharacters: z.array(z.string()),
      forbiddenElements: z.array(z.string()),
      entryDescription: z.string(),
    }).optional(),
    cameraConstraints: z.object({
      enabled: z.boolean(),
      allowedTypes: z.array(z.string()),
      forbiddenMovements: z.array(z.string()),
      maxCameraSpeed: z.string(),
      defaultLens: z.string(),
      depthOfField: z.string(),
    }).optional(),
    coreConvergence: z.object({
      enabled: z.boolean(),
      alwaysInclude: z.array(z.string()),
      neverInclude: z.array(z.string()),
    }).optional(),
    unifiedPrefix: z.object({
      enabled: z.boolean(),
      imagePrefix: z.string(),
      videoPrefix: z.string(),
    }).optional(),
    characterUniform: z.object({
      enabled: z.boolean(),
      settings: z.array(z.object({
        characterName: z.string(),
        fixedSeed: z.number(),
        fixedClothing: z.string(),
        fixedHairStyle: z.string(),
        fixedAccessories: z.string(),
        postureLock: z.string(),
      })),
    }).optional(),
  }),
  async (req, res) => {
    try {
      const config = req.body as AntiDriftConfig;
      await saveAntiDriftConfig(config);
      res.status(200).send(success({ message: "防跑偏配置保存成功" }));
    } catch (err: any) {
      res.status(500).send(error(`保存防跑偏配置失败: ${err.message}`));
    }
  },
);
