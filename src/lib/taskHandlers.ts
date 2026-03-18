import taskQueue from "@/lib/taskQueue";
import { generateSpeech } from "@/utils/ai/audio";
import u from "@/utils";

export function registerTaskHandlers() {
  // Audio/TTS task handler
  taskQueue.registerHandler("audio", async (payload, onProgress, signal) => {
    onProgress(10);

    const result = await generateSpeech({
      text: payload.text,
      voiceId: payload.voiceId,
      emotion: payload.emotion,
      speed: payload.speed,
    });

    onProgress(80);

    // Save to file
    const projectDir = payload.projectId || "global";
    const fileName = `${projectDir}/audio/${u.uuid()}.${result.format}`;
    await u.oss.writeFile(fileName, result.audioBuffer);

    onProgress(100);

    return {
      filePath: fileName,
      duration: result.duration,
      format: result.format,
      character: payload.character,
    };
  });

  // Video generation task handler
  taskQueue.registerHandler("video", async (payload, onProgress, signal) => {
    onProgress(10);

    // generateVideo default export: (config: VideoConfig, manufacturer: string) => Promise<string>
    const generateVideo = (await import("@/utils/ai/generateVideo")).default;

    onProgress(30);
    const result = await generateVideo(
      {
        prompt: payload.prompt,
        savePath: payload.savePath,
        imageBase64: payload.imageBase64,
        duration: payload.duration || 5,
        aspectRatio: payload.aspectRatio || "9:16",
      } as any,
      payload.manufacturer || "volcengine"
    );
    onProgress(100);

    return { filePath: result };
  });

  // Image generation task handler
  taskQueue.registerHandler("image", async (payload, onProgress, signal) => {
    onProgress(10);

    // image default export: (input: ImageConfig, config: AIConfig) => Promise<string>
    const generateImage = (await import("@/utils/ai/image")).default;
    const aiConfig = payload.aiConfig || (await u.getConfig("image", payload.manufacturer));
    if (!aiConfig) throw new Error("未找到图片生成配置，请在设置中添加图片模型");

    onProgress(30);
    const imageUrl = await generateImage(payload, aiConfig);
    onProgress(100);

    return { imageUrl };
  });

  // Script generation task handler
  taskQueue.registerHandler("script", async (payload, onProgress, signal) => {
    onProgress(10);

    const { autoGenerateScript } = await import("./autoScriptGenerator");
    const result = await autoGenerateScript({
      promptText: payload.promptText || payload.prompt,
      style: payload.style,
      maxRewrites: payload.maxRewrites || 2,
    });

    onProgress(100);
    return result;
  });

  // Start polling for stuck tasks
  taskQueue.startPolling();
}
