import generateImagePromptsTool from "@/agents/storyboard/generateImagePromptsTool";
import u from "@/utils";
import sharp from "sharp";
import { z } from "zod";
import { CharacterRef, matchCharactersInPrompt } from "@/utils/characterReference";
import { buildConsistencyInjection } from "@/lib/characterConsistency";
import { getAntiDriftPromptForProject, getImagePrefix } from "@/lib/antiDrift";

/**
 * 加载一致性收敛提示词（角色/背景/风格）
 * 优先使用 customValue，否则使用 defaultValue
 */
async function loadConsistencyPrompts(): Promise<string> {
  const codes = ["consistency-character", "consistency-background", "consistency-style"];
  const rows = await u.db("t_prompts").whereIn("code", codes);
  if (!rows || rows.length === 0) return "";

  const parts: string[] = [];
  for (const row of rows) {
    const value = row.customValue || row.defaultValue;
    if (value) {
      parts.push(value);
    }
  }
  return parts.join("\n\n");
}

interface AssetItem {
  name: string;
  description: string;
}

interface EpisodeData {
  episodeIndex: number;
  title: string;
  chapterRange: number[];
  scenes: AssetItem[];
  characters: AssetItem[];
  props: AssetItem[];
  coreConflict: string;
  openingHook: string;
  outline: string;
  keyEvents: string[];
  emotionalCurve: string;
  visualHighlights: string[];
  endingHook: string;
  classicQuotes: string[];
}

interface ImageInfo {
  name: string;
  type: string;
  filePath: string;
}

interface ResourceItem {
  name: string;
  intro: string;
}

// 压缩图片直到不超过指定大小
async function compressImage(buffer: Buffer, maxSizeBytes: number = 3 * 1024 * 1024): Promise<Buffer> {
  if (buffer.length <= maxSizeBytes) {
    return buffer;
  }
  let quality = 90;
  let compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer();
  while (compressedBuffer.length > maxSizeBytes && quality > 10) {
    quality -= 10;
    compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer();
  }
  if (compressedBuffer.length > maxSizeBytes) {
    const metadata = await sharp(buffer).metadata();
    let scale = 0.9;
    while (compressedBuffer.length > maxSizeBytes && scale > 0.1) {
      const newWidth = Math.round((metadata.width || 1000) * scale);
      const newHeight = Math.round((metadata.height || 1000) * scale);
      compressedBuffer = await sharp(buffer)
        .resize(newWidth, newHeight, { fit: "inside" })
        .jpeg({ quality: Math.max(quality, 30) })
        .toBuffer();
      scale -= 0.1;
    }
  }
  return compressedBuffer;
}

// 拼接多张图片为一张
async function mergeImages(imagePaths: string[]): Promise<Buffer> {
  const imageBuffers = await Promise.all(imagePaths.map((path) => u.oss.getFile(path)));
  const imageMetadatas = await Promise.all(imageBuffers.map((buffer) => sharp(buffer).metadata()));
  const maxHeight = Math.max(...imageMetadatas.map((m) => m.height || 0));
  const resizedImages = await Promise.all(
    imageBuffers.map(async (buffer, index) => {
      const metadata = imageMetadatas[index];
      const aspectRatio = (metadata.width || 1) / (metadata.height || 1);
      const newWidth = Math.round(maxHeight * aspectRatio);
      return {
        buffer: await sharp(buffer).resize(newWidth, maxHeight, { fit: "cover" }).toBuffer(),
        width: newWidth,
      };
    }),
  );
  let currentX = 0;
  const compositeInputs = resizedImages.map(({ buffer, width }) => {
    const input = {
      input: buffer,
      left: currentX,
      top: 0,
    };
    currentX += width;
    return input;
  });
  const mergedImage = await sharp({
    create: {
      width: currentX,
      height: maxHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(compositeInputs)
    .jpeg({ quality: 90 })
    .toBuffer();
  return compressImage(mergedImage);
}

// 进一步压缩单张图片到指定大小
async function compressToSize(buffer: Buffer, targetSize: number): Promise<Buffer> {
  if (buffer.length <= targetSize) {
    return buffer;
  }

  const metadata = await sharp(buffer).metadata();
  let quality = 80;
  let scale = 1.0;
  let compressedBuffer = buffer;

  // 先尝试降低质量
  while (compressedBuffer.length > targetSize && quality > 10) {
    compressedBuffer = await sharp(buffer).jpeg({ quality }).toBuffer();
    quality -= 10;
  }

  // 如果还是太大，缩小尺寸
  while (compressedBuffer.length > targetSize && scale > 0.2) {
    scale -= 0.1;
    const newWidth = Math.round((metadata.width || 1000) * scale);
    const newHeight = Math.round((metadata.height || 1000) * scale);
    compressedBuffer = await sharp(buffer)
      .resize(newWidth, newHeight, { fit: "inside" })
      .jpeg({ quality: Math.max(quality, 20) })
      .toBuffer();
  }

  return compressedBuffer;
}

// 确保图片列表总大小不超过指定限制
async function ensureTotalSizeLimit(buffers: Buffer[], maxTotalBytes: number = 10 * 1024 * 1024): Promise<Buffer[]> {
  let totalSize = buffers.reduce((sum, buf) => sum + buf.length, 0);

  if (totalSize <= maxTotalBytes) {
    return buffers;
  }

  // 计算每张图片的平均目标大小
  const avgTargetSize = Math.floor(maxTotalBytes / buffers.length);

  // 按大小降序排列，优先压缩大图片
  const indexedBuffers = buffers.map((buf, idx) => ({ buf, idx, size: buf.length }));
  indexedBuffers.sort((a, b) => b.size - a.size);

  const result = [...buffers];

  for (const item of indexedBuffers) {
    totalSize = result.reduce((sum, buf) => sum + buf.length, 0);
    if (totalSize <= maxTotalBytes) {
      break;
    }

    // 计算这张图片需要压缩到的目标大小
    const excessSize = totalSize - maxTotalBytes;
    const targetSize = Math.max(item.buf.length - excessSize, avgTargetSize, 100 * 1024); // 最小100KB

    if (item.buf.length > targetSize) {
      result[item.idx] = await compressToSize(item.buf, targetSize);
    }
  }

  return result;
}

// 处理图片列表，确保不超过10张且每张不超过3MB，总大小不超过10MB
async function processImages(images: ImageInfo[]): Promise<Buffer[]> {
  const maxImages = 10;
  let processedBuffers: Buffer[];

  if (images.length <= maxImages) {
    const buffers = await Promise.all(images.map((img) => u.oss.getFile(img.filePath)));

    processedBuffers = await Promise.all(buffers.map((buffer) => compressImage(buffer)));
  } else {
    const mergeStartIndex = maxImages - 1;

    const firstBuffers = await Promise.all(images.slice(0, mergeStartIndex).map((img) => u.oss.getFile(img.filePath)));

    const compressedFirstImages = await Promise.all(firstBuffers.map((buffer) => compressImage(buffer)));

    const imagesToMergeList = images.slice(mergeStartIndex).map((img) => img.filePath);

    const mergedImage = await mergeImages(imagesToMergeList);

    processedBuffers = [...compressedFirstImages, mergedImage];
  }

  // 确保总大小不超过10MB
  return ensureTotalSizeLimit(processedBuffers);
}

// 使用 AI 过滤与分镜相关的资产
async function filterRelevantAssets(prompts: string[], allResources: ResourceItem[], availableImages: ImageInfo[]): Promise<ImageInfo[]> {
  if (allResources.length === 0 || availableImages.length === 0) {
    return availableImages;
  }

  const availableNames = new Set(availableImages.map((img) => img.name));
  const availableResources = allResources.filter((r) => availableNames.has(r.name));

  if (availableResources.length === 0) {
    return availableImages;
  }

  const apiConfig = await u.getPromptAi("storyboardAgent");
  const { relevantAssets } = await u.ai.text.invoke(
    {
      messages: [
        {
          role: "user",
          content: `请分析以下分镜描述，从可用资产中筛选出与分镜内容直接相关的资产。

分镜描述：
${prompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}

可用资产列表：
${availableResources.map((r) => `- ${r.name}：${r.intro}`).join("\n")}

请仅选择在分镜中明确出现或被提及的角色、场景、道具。不要选择与分镜内容无关的资产。`,
        },
      ],
      output: {
        relevantAssets: z
          .array(
            z.object({
              name: z.string().describe("资产名称"),
              reason: z.string().describe("选择该资产的原因"),
            }),
          )
          .describe("与分镜内容相关的资产列表"),
      },
    },
    apiConfig,
  );

  if (!relevantAssets || relevantAssets.length === 0) {
    return availableImages;
  }

  const relevantNames = new Set(relevantAssets.map((a) => a.name));
  const filteredImages = availableImages.filter((img) => relevantNames.has(img.name));

  return filteredImages.length > 0 ? filteredImages : availableImages;
}

// 构建资产映射提示词
function buildResourcesMapPrompts(images: ImageInfo[]): string {
  if (images.length === 0) return "";

  const mapping = images.map((item, index) => {
    if (index < 9) {
      return `${item.name}=图片${index + 1}`;
    } else {
      return `${item.name}=图10-${index - 8}`;
    }
  });

  return `其中人物、场景、道具参考对照关系如下：${mapping.join(", ")}。`;
}

export default async (cells: { prompt: string }[], scriptId: number, projectId: number, characterRefs?: CharacterRef[]) => {
  const scriptData = await u.db("t_script").where({ id: scriptId, projectId }).first();
  const projectInfo = await u.db("t_project").where({ id: projectId }).first();

  const row = await u.db("t_outline").where({ id: scriptData?.outlineId!, projectId }).first();
  let outline: EpisodeData | null = null;
  if (row?.data) {
    try {
      outline = JSON.parse(row.data);
    } catch (e) {
      console.error("Failed to parse outline data for outlineId:", scriptData?.outlineId, e);
    }
  }

  const resources: ResourceItem[] = outline
    ? (["characters", "props", "scenes"] as const).flatMap((k) => outline[k]?.map((i) => ({ name: i.name, intro: i.description })) ?? [])
    : [];

  const resourceNames = resources.map((r) => r.name);
  const imagesRaw = await u.db("t_assets").whereIn("name", resourceNames).andWhere({ projectId }).select("name", "type", "filePath");

  const allImages = imagesRaw
    .sort((a, b) => {
      const order = ["角色", "场景", "道具"];
      return order.indexOf(a.type!) - order.indexOf(b.type!);
    })
    .filter((img) => img.filePath) as ImageInfo[];

  if (allImages.length === 0) {
    throw new Error("未找到可用的图片资源");
  }

  const cellPrompts = cells.map((c) => c.prompt);

  // 使用 AI 过滤相关资产
  const filteredImages = await filterRelevantAssets(cellPrompts, resources, allImages);

  const resourcesMapPrompts = buildResourcesMapPrompts(filteredImages);

  const promptsData = await generateImagePromptsTool({
    prompts: cellPrompts,
    style: `类型：${projectInfo?.type!}，风格：${projectInfo?.artStyle!}`,
    aspectRatio: projectInfo?.videoRatio! as any,
    assetsName: resources,
  });

  //   const prompts = `请生成${promptsData.gridLayout.totalCells}格,${promptsData.gridLayout.cols}列×${promptsData.gridLayout.rows}行宫格图。

  // ${promptsData.prompt}

  // 注意：请严格按照提示词内容生成图片，确保人物样貌、艺术风格、色调光影一致。
  // `;
  // Prepend anti-drift image prefix if configured
  const prompts = imagePrefix ? `${imagePrefix}\n\n${promptsData.prompt}` : promptsData.prompt;

  const processedImages = await processImages(filteredImages);

  // Inject character reference images if available
  let charRefBuffers: Buffer[] = [];
  if (characterRefs && characterRefs.length > 0) {
    const combinedPromptText = cellPrompts.join(" ");
    const matchedChars = matchCharactersInPrompt(combinedPromptText, characterRefs);
    if (matchedChars.length > 0) {
      try {
        const charBuffers = await Promise.all(
          matchedChars.map(async (charRef) => {
            const buf = await u.oss.getFile(charRef.referenceImage);
            return compressImage(buf);
          }),
        );
        charRefBuffers = charBuffers;
      } catch (e) {
        // If character reference loading fails, continue without them
      }
    }
  }

  // === Character Consistency System: inject CHARACTER LOCK prompts ===
  const { consistencyPrompt: charLockPrompt, matchedIdentities } = await buildConsistencyInjection(
    projectId,
    cellPrompts,
  );

  // Load reference images from matched character identities
  if (matchedIdentities.length > 0) {
    for (const identity of matchedIdentities) {
      if (identity.referenceImagePath) {
        try {
          const buf = await u.oss.getFile(identity.referenceImagePath);
          const compressed = await compressImage(buf);
          charRefBuffers.push(compressed);
        } catch {
          // Skip if reference image not found
        }
      }
    }
  }

  const allImageBuffers = [...processedImages, ...charRefBuffers];
  const apiConfig = await u.getPromptAi("storyboardImage");

  // 加载一致性收敛提示词并注入到系统提示中
  const consistencyPrompts = await loadConsistencyPrompts();

  // Load anti-drift rules for the project
  const antiDriftPrompt = await getAntiDriftPromptForProject(projectId);
  const imagePrefix = await getImagePrefix(projectId);

  // Combine: generic consistency prompts + character lock prompts + anti-drift + resource map
  const systemParts: string[] = [];
  if (consistencyPrompts) systemParts.push(consistencyPrompts);
  if (charLockPrompt) systemParts.push(charLockPrompt);
  if (antiDriftPrompt) systemParts.push(antiDriftPrompt);
  if (resourcesMapPrompts) systemParts.push(resourcesMapPrompts);
  const fullSystemPrompt = systemParts.join("\n\n");

  const contentStr = await u.ai.image(
    {
      systemPrompt: fullSystemPrompt,
      prompt: prompts,
      size: "4K",
      aspectRatio: projectInfo?.videoRatio ? (projectInfo.videoRatio as any) : "16:9",
      imageBase64: allImageBuffers.map((buf) => buf.toString("base64")),
      taskClass: "分镜图生成",
      name: `分镜图-${outline?.title || "未知剧集"}`,
      describe: prompts,
      projectId,
    },
    apiConfig,
  );
  const match = contentStr.match(/base64,([A-Za-z0-9+/=]+)/);
  const base64Str = match?.[1] ?? contentStr;
  const buffer = Buffer.from(base64Str, "base64");

  return buffer;
};
