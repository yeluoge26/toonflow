/**
 * Sora Web Reverse Proxy Provider
 *
 * 支持两种主流 Sora 反代协议:
 * 1. OpenAI 兼容格式 (如 one-api/new-api 中转)
 * 2. 原生 Sora Web API 格式 (如 sora-webui 反代)
 *
 * 配置方式 (在管理后台 → 模型配置 → 添加视频模型):
 *   manufacturer: "sora"
 *   model: "sora-turbo" (或你反代暴露的模型名)
 *   apiKey: 你的反代 API Key / Session Token
 *   baseUrl: 提交URL|查询URL
 *     例: https://your-proxy.com/v1/video/generations|https://your-proxy.com/v1/video/generations/{id}
 *     或: https://your-proxy.com/api/generate|https://your-proxy.com/api/status/{taskId}
 */
import "../type";
import axios from "axios";
import { pollTask } from "@/utils/ai/utils";
import u from "@/utils";
import path from "path";

function template(replaceObj: Record<string, any>, url: string) {
  return url.replace(/\{(\w+)\}/g, (match, varName) => {
    return replaceObj.hasOwnProperty(varName) ? replaceObj[varName] : match;
  });
}

export default async (input: VideoConfig, config: AIConfig) => {
  if (!config.apiKey) throw new Error("缺少 Sora 反代 API Key / Session Token");
  if (!config.baseURL) throw new Error("缺少 baseURL (格式: 提交URL|查询URL)");

  const [submitUrl, queryUrl] = config.baseURL.split("|");
  if (!submitUrl || !queryUrl) throw new Error("baseURL 格式错误，需要: 提交URL|查询URL");

  const authorization = config.apiKey.startsWith("Bearer ") ? config.apiKey : `Bearer ${config.apiKey}`;
  const model = config.model || "sora-turbo";

  // 构建请求体 — 兼容多种反代格式
  const body: Record<string, any> = {
    model,
    prompt: input.prompt,
    // Sora 原生参数
    n: 1,
    duration: input.duration || 5,
    aspect_ratio: input.aspectRatio || "16:9",
    resolution: input.resolution || "720p",
  };

  // 图生视频：附加首帧图片
  if (input.imageBase64 && input.imageBase64.length > 0) {
    const img = input.imageBase64[0];
    // 不同反代格式兼容
    body.image = img;            // 格式1: base64 直传
    body.image_url = img;        // 格式2: URL 或 data URI
    body.first_frame = img;      // 格式3: Sora 原生字段名
    if (input.imageBase64.length > 1) {
      body.last_frame = input.imageBase64[1];  // 尾帧
    }
  }

  // 提交任务
  console.log(`[Sora] Submitting to ${submitUrl}, model=${model}`);
  const submitRes = await axios.post(submitUrl, body, {
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    timeout: 60000,
  });

  const submitData = submitRes.data;

  // 兼容多种返回格式提取 taskId
  const taskId = submitData.id
    || submitData.task_id
    || submitData.data?.id
    || submitData.data?.task_id
    || submitData.generation_id;

  if (!taskId) {
    throw new Error(`Sora 任务提交失败: ${JSON.stringify(submitData).substring(0, 300)}`);
  }

  console.log(`[Sora] Task submitted: ${taskId}`);

  // 轮询任务状态
  return await pollTask(async () => {
    const finalQueryUrl = template({ id: taskId, taskId: taskId }, queryUrl);

    const { data: queryData } = await axios.get(finalQueryUrl, {
      headers: { Authorization: authorization },
      timeout: 30000,
    });

    // 兼容多种状态字段
    const status = queryData.status
      || queryData.data?.status
      || queryData.state
      || queryData.task_status;

    const normalizedStatus = (status || "").toLowerCase();

    // 完成状态
    if (["completed", "succeeded", "success", "done", "finished"].includes(normalizedStatus)) {
      // 兼容多种视频 URL 字段
      const videoUrl = queryData.video_url
        || queryData.url
        || queryData.data?.video_url
        || queryData.data?.url
        || queryData.output?.video_url
        || queryData.result?.url
        || queryData.generations?.[0]?.url
        || queryData.data?.generations?.[0]?.url;

      if (!videoUrl) {
        return { completed: false, error: "任务完成但未返回视频URL" };
      }

      // 下载视频到本地
      try {
        const videoRes = await axios.get(videoUrl, {
          headers: videoUrl.startsWith("http") && !videoUrl.includes("openai") ? {} : { Authorization: authorization },
          responseType: "arraybuffer",
          timeout: 300000,
        });

        const fileName = `sora_${Date.now()}.mp4`;
        const localPath = path.join("uploads", "1", "video", fileName);
        await u.oss.writeFile(localPath, videoRes.data);

        return { completed: true, url: localPath };
      } catch (dlErr: any) {
        // 如果下载失败，直接返回远程 URL
        console.warn(`[Sora] Download failed, returning remote URL: ${dlErr.message}`);
        return { completed: true, url: videoUrl };
      }
    }

    // 失败状态
    if (["failed", "error", "cancelled", "canceled"].includes(normalizedStatus)) {
      const errorMsg = queryData.error
        || queryData.message
        || queryData.data?.error
        || queryData.data?.message
        || "未知错误";
      return { completed: false, error: `Sora 生成失败: ${errorMsg}` };
    }

    // 进行中
    return { completed: false };
  });
};
