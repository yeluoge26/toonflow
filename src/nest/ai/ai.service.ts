import { Injectable } from "@nestjs/common";

@Injectable()
export class AIService {
  // Wraps existing AI utilities - delegates to the original utils
  async generateText(config: any, system: string, prompt: string) {
    const u = (await import("../../utils")).default;
    const promptAi = config || await u.getPromptAi("generateScript");
    return u.ai.text.invoke({ system, prompt }, promptAi);
  }

  async generateImage(config: any, prompt: string, options: any = {}) {
    const generateImage = (await import("../../utils/ai/image")).default;
    return generateImage({ prompt, ...options }, config);
  }

  async generateVideo(config: any, manufacturer: string) {
    const generateVideo = (await import("../../utils/ai/generateVideo")).default;
    return generateVideo(config, manufacturer);
  }

  async generateSpeech(request: any) {
    const { generateSpeech } = await import("../../utils/ai/audio");
    return generateSpeech(request);
  }

  async scoreProject(projectId: number) {
    const { scoreProject } = await import("../../lib/scoringEngine");
    return scoreProject(projectId);
  }

  async validateScript(content: string) {
    const { validateScript } = await import("../../lib/scriptValidator");
    return validateScript(content);
  }

  async autoGenerateScript(config: any) {
    const { autoGenerateScript } = await import("../../lib/autoScriptGenerator");
    return autoGenerateScript(config);
  }
}
