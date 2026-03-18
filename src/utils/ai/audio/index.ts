import u from "@/utils";

export interface TTSConfig {
  manufacturer: string;  // 'cosyvoice' | 'chattts' | 'fishspeech' | 'openai'
  model: string;
  apiKey: string;
  baseUrl: string;
}

export interface TTSRequest {
  text: string;
  voiceId?: string;      // character voice clone ID
  emotion?: string;      // 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful'
  speed?: number;        // 0.5 - 2.0
  pitch?: number;        // 0.5 - 2.0
}

export interface TTSResult {
  audioBuffer: Buffer;
  duration: number;      // seconds
  format: string;        // 'mp3' | 'wav'
}

// Get TTS config from database
async function getTTSConfig(): Promise<TTSConfig | null> {
  const config = await u.db("t_config").where("type", "audio").first();
  if (!config) return null;
  return {
    manufacturer: config.manufacturer || "",
    model: config.model || "",
    apiKey: config.apiKey || "",
    baseUrl: config.baseUrl || "",
  };
}

// Main TTS generation function
export async function generateSpeech(request: TTSRequest): Promise<TTSResult> {
  const config = await getTTSConfig();
  if (!config) throw new Error("未配置TTS模型，请在设置中添加语音模型");

  // Route to manufacturer-specific implementation
  switch (config.manufacturer) {
    case "cosyvoice":
      return await cosyVoiceGenerate(config, request);
    case "chattts":
      return await chatTTSGenerate(config, request);
    case "fishspeech":
      return await fishSpeechGenerate(config, request);
    case "openai":
      return await openAITTSGenerate(config, request);
    default:
      throw new Error(`不支持的TTS厂商: ${config.manufacturer}`);
  }
}

// Stub implementations - to be filled when integrating specific APIs
async function cosyVoiceGenerate(config: TTSConfig, request: TTSRequest): Promise<TTSResult> {
  // TODO: Implement CosyVoice API integration
  throw new Error("CosyVoice集成开发中");
}

async function chatTTSGenerate(config: TTSConfig, request: TTSRequest): Promise<TTSResult> {
  // TODO: Implement ChatTTS API integration
  throw new Error("ChatTTS集成开发中");
}

async function fishSpeechGenerate(config: TTSConfig, request: TTSRequest): Promise<TTSResult> {
  // TODO: Implement Fish Speech API integration
  throw new Error("FishSpeech集成开发中");
}

async function openAITTSGenerate(config: TTSConfig, request: TTSRequest): Promise<TTSResult> {
  // TODO: Implement OpenAI TTS API integration
  throw new Error("OpenAI TTS集成开发中");
}

// Parse script to extract dialogue lines with character names
export function extractDialogues(scriptContent: string): Array<{ character: string; line: string; emotion?: string }> {
  const dialogues: Array<{ character: string; line: string; emotion?: string }> = [];
  // Match patterns like: 角色名："对白内容" or 角色名（情绪）："对白内容"
  const regex = /([^\s"：]+?)(?:（([^）]+)）)?[：:]"([^"]+)"/g;
  let match;
  while ((match = regex.exec(scriptContent)) !== null) {
    dialogues.push({
      character: match[1],
      emotion: match[2] || undefined,
      line: match[3],
    });
  }
  return dialogues;
}
