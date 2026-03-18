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

  // Start polling for stuck tasks
  taskQueue.startPolling();
}
