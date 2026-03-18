import express from "express";
import u from "@/utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { t_config } from "@/types/database";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const router = express.Router();

// 生成视频
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    configId: z.number().optional(), // 关联的视频配 置ID
    type: z.string().optional(),
    resolution: z.string(),
    aiConfigId: z.number(),
    filePath: z.array(z.string()),
    duration: z.number(),
    prompt: z.string(),
    mode: z.enum(["startEnd", "multi", "single", "text"]),
    audioEnabled: z.boolean(),
  }),
  async (req, res) => {
    const { type, mode, scriptId, projectId, configId, aiConfigId, resolution, filePath, duration, prompt, audioEnabled } = req.body;

    if (mode == "text") filePath.length = 0;
    else if (!filePath.length) {
      return res.status(400).send(error("请先选择图片"));
    }
    const configData = await u.db("t_videoConfig").where("id", configId).first();
    if (!configData) {
      return res.status(400).send(error("视频配置不存在"));
    }
    // 优先使用视频配置中的AI配置ID查询,查不到再使用传入的aiConfigId
    let aiConfigData = null;
    if (configData.aiConfigId) {
      aiConfigData = await u.db("t_config").where("id", configData.aiConfigId).first();
    }
    if (!aiConfigData || !aiConfigData?.model) {
      return res.status(400).send(error("模型不存在"));
    }
    if (aiConfigData.model?.includes("sora")) {
      if (filePath.length > 1) {
        const gridUrl = await sharpProcessingImage(filePath, projectId);
        if (gridUrl) {
          filePath.length = 0;
          filePath.push(gridUrl);
        }
      }
    }

    // 过滤掉空值
    let fileUrl = filePath.filter((p: string) => p && p.trim() !== "");

    // 处理文件路径，如果是 base64 则上传到 OSS
    if (fileUrl.length) {
      const match = fileUrl[0].match(/base64,([A-Za-z0-9+/=]+)/);
      if (match && match.length >= 2) {
        const imagePath = `/${projectId}/assets/${uuidv4()}.jpg`;
        const buffer = Buffer.from(match[1], "base64");
        await u.oss.writeFile(imagePath, buffer);
        fileUrl = [await u.oss.getFileUrl(imagePath)];
      }
    }

    // 提取路径名的辅助函数
    const getPathname = (url: string): string => {
      // 如果是完整 URL，提取 pathname
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return new URL(url).pathname;
      }
      // 否则认为已经是路径
      return url;
    };
    if (fileUrl.length) {
      // 校验文件是否存在
      const fileExistsResults = await Promise.all(
        fileUrl.map(async (url: string) => {
          const path = getPathname(url);
          return u.oss.fileExists(path);
        }),
      );

      if (!fileExistsResults.every(Boolean)) {
        return res.status(400).send(error("选择分镜文件不存在"));
      }
    }

    const firstFrame = fileUrl.length ? getPathname(fileUrl[0]) : "";
    const storyboardImgs = fileUrl.map((path: string) => getPathname(path));
    const savePath = `/${projectId}/video/${uuidv4()}.mp4`;

    // 先插入记录，state 默认为 0
    const [videoId] = await u.db("t_video").insert({
      scriptId,
      configId: configId || null, // 关联的视频配置ID
      time: duration,
      resolution,
      prompt,
      firstFrame,
      storyboardImgs: JSON.stringify(storyboardImgs),
      filePath: savePath,
      state: 0,
    });

    // 立即返回，不等待视频生成
    res.status(200).send(success({ id: videoId, configId: configId || null }));

    // 异步生成视频
    generateVideoAsync(videoId, projectId, fileUrl, savePath, prompt, duration, resolution, audioEnabled, aiConfigData, mode).catch(async (err) => {
      try {
        await u.db("t_video").where("id", videoId).update({ state: -1, errorReason: u.error(err).message });
      } catch (_) {}
    });
  },
);

// 异步生成视频
async function generateVideoAsync(
  videoId: number,
  projectId: number,
  fileUrl: string[],
  savePath: string,
  prompt: string,
  duration: number,
  resolution: string,
  audioEnabled: boolean,
  aiConfigData: t_config,
  mode: string,
) {
  try {
    const projectData = await u.db("t_project").where("id", projectId).select("artStyle", "videoRatio").first();

    // 提取路径名的辅助函数
    const getPathname = (url: string): string => {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return new URL(url).pathname;
      }
      return url;
    };

    const imageBase64 = await Promise.all(
      fileUrl.map((path: string) => {
        if (path.startsWith("http://") || path.startsWith("https://")) {
          return u.oss.getImageBase64(getPathname(path));
        }
        // 如果是相对路径，直接获取
        return u.oss.getImageBase64(path);
      }),
    );

    const inputPrompt = `
请完全参照以下内容生成视频：
${prompt}
重要强调：
风格高度保持${projectData?.artStyle || "CG"}风格，保证人物一致性
1. 视频整体风格、色调、光影、人脸五官与参考图片保持高度一致
2. 保证视频连贯性、前后无矛盾
3. 关键人物在画面中全部清晰显示，不得被遮挡、缺失或省略
4. 画面真实、细致，无畸形、无模糊、无杂物、无多余人物、无文字、水印、logo
`;
    const videoPath = await u.ai.video(
      {
        imageBase64,
        savePath,
        prompt: inputPrompt,
        duration: duration as any,
        aspectRatio: projectData?.videoRatio as any,
        resolution: resolution as any,
        audio: audioEnabled,
        mode: mode as any,
        taskClass: "视频生成",
        name: `视频生成-${videoId}`,
        describe: `视频生成，时长${duration}秒，分辨率${resolution}`,
        projectId,
      },
      {
        baseURL: aiConfigData?.baseUrl!,
        model: aiConfigData?.model!,
        apiKey: aiConfigData?.apiKey!,
        manufacturer: aiConfigData?.manufacturer!,
      },
    );

    if (videoPath) {
      // 生成成功，更新状态为 1
      await u.db("t_video").where("id", videoId).update({
        filePath: videoPath,
        state: 1,
      });
    } else {
      // 生成失败，更新状态为 -1
      await u.db("t_video").where("id", videoId).update({ state: -1 });
    }
  } catch (err) {
    // console.error(`视频生成失败 videoId=${videoId}:`, (err as any).response);
    await u
      .db("t_video")
      .where("id", videoId)
      .update({ state: -1, errorReason: u.error(err).message });
  }
}

/**
 * 使用sharp把图片拼接为宫格图，最多3x3，图片数量为1-9不等
 * @param imageList - 图片路径或base64数组
 * @returns 拼接后的图片Buffer
 */
async function sharpProcessingImage(imageList: string[], projectId: number): Promise<string> {
  if (!imageList || imageList.length === 0) {
    throw new Error("图片列表不能为空");
  }

  if (imageList.length > 9) {
    throw new Error("图片数量不能超过9张");
  }

  // 计算网格布局：根据图片数量确定行列数
  const count = imageList.length;
  let cols: number, rows: number;

  if (count === 1) {
    cols = rows = 1;
  } else if (count === 2) {
    cols = 2;
    rows = 1;
  } else if (count <= 4) {
    cols = rows = 2;
  } else if (count <= 6) {
    cols = 3;
    rows = 2;
  } else {
    cols = rows = 3;
  }

  // 第一步：加载所有图片并获取原始尺寸
  const loadedImages = await Promise.all(
    imageList.map(async (imagePath) => {
      let imageBuffer: Buffer;

      // 判断是base64、URL还是文件路径
      if (imagePath.startsWith("data:image") || imagePath.match(/^[A-Za-z0-9+/=]+$/)) {
        // Base64格式
        const base64Data = imagePath.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, "base64");
      } else if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        // URL格式，提取pathname后从OSS读取
        const pathname = new URL(imagePath).pathname;
        imageBuffer = await u.oss.getFile(pathname);
      } else {
        // 文件路径，直接从OSS读取
        imageBuffer = await u.oss.getFile(imagePath);
      }

      const metadata = await sharp(imageBuffer).metadata();
      return {
        buffer: imageBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    }),
  );

  // 第二步：找出所有图片中的最大宽度和高度
  const maxWidth = Math.max(...loadedImages.map((img) => img.width));
  const maxHeight = Math.max(...loadedImages.map((img) => img.height));

  // 第三步：将所有图片调整为统一尺寸（使用contain模式保持比例，填充背景色）
  const imageData = await Promise.all(
    loadedImages.map(async (img) => {
      const resizedBuffer = await sharp(img.buffer)
        .resize(maxWidth, maxHeight, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 1 }, // 黑色背景填充
        })
        .png()
        .toBuffer();

      return {
        buffer: resizedBuffer,
        width: maxWidth,
        height: maxHeight,
      };
    }),
  );

  // 所有图片都是相同尺寸，直接计算画布大小
  const cellWidth = maxWidth;
  const cellHeight = maxHeight;
  const canvasWidth = cols * cellWidth;
  const canvasHeight = rows * cellHeight;

  // 创建空白画布
  const canvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  // 准备合成操作
  const compositeOperations = imageData.map((data, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    // 计算当前图片的位置（无偏移，紧密排列）
    const left = col * cellWidth;
    const top = row * cellHeight;

    return {
      input: data.buffer,
      top: top,
      left: left,
    };
  });

  // 合成所有图片
  const result = await canvas.composite(compositeOperations).png().toBuffer();

  const imagePath = `/${projectId}/assets/${uuidv4()}.jpg`;
  const buffer = Buffer.from(result as any, "base64");
  await u.oss.writeFile(imagePath, buffer);

  return await u.oss.getFileUrl(imagePath);
}
