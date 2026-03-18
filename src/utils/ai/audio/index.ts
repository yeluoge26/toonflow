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

// OpenAI TTS implementation
async function openAITTSGenerate(config: TTSConfig, request: TTSRequest): Promise<TTSResult> {
  const axios = (await import("axios")).default;

  const response = await axios.post(
    `${config.baseUrl || "https://api.openai.com"}/v1/audio/speech`,
    {
      model: config.model || "tts-1-hd",
      input: request.text,
      voice: request.voiceId || "alloy",
      speed: request.speed || 1.0,
      response_format: "mp3",
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: 60000,
    }
  );

  const audioBuffer = Buffer.from(response.data);
  // Estimate duration: MP3 ~128kbps = 16KB/sec
  const estimatedDuration = Math.round(audioBuffer.length / 16000);

  return {
    audioBuffer,
    duration: estimatedDuration,
    format: "mp3",
  };
}

// Fish Speech implementation (OpenAI-compatible endpoint)
async function fishSpeechGenerate(config: TTSConfig, request: TTSRequest): Promise<TTSResult> {
  const axios = (await import("axios")).default;

  const response = await axios.post(
    `${config.baseUrl}/v1/audio/speech`,
    {
      model: config.model || "fish-speech-1.5",
      input: request.text,
      voice: request.voiceId || "default",
      speed: request.speed || 1.0,
      response_format: "mp3",
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: 60000,
    }
  );

  return {
    audioBuffer: Buffer.from(response.data),
    duration: Math.round(response.data.length / 16000),
    format: "mp3",
  };
}

// CosyVoice implementation (DashScope-compatible API)
async function cosyVoiceGenerate(config: TTSConfig, request: TTSRequest): Promise<TTSResult> {
  const axios = (await import("axios")).default;

  const response = await axios.post(
    `${config.baseUrl}/api/v1/tts`,
    {
      model: config.model || "cosyvoice-v2",
      input: { text: request.text },
      voice: request.voiceId || "longxiaochun",
      parameters: {
        speed: request.speed || 1.0,
        emotion: request.emotion || "neutral",
        format: "mp3",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: 60000,
    }
  );

  return {
    audioBuffer: Buffer.from(response.data),
    duration: Math.round(response.data.length / 16000),
    format: "mp3",
  };
}

// ChatTTS implementation
async function chatTTSGenerate(config: TTSConfig, request: TTSRequest): Promise<TTSResult> {
  const axios = (await import("axios")).default;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await axios.post(
    `${config.baseUrl}/generate`,
    {
      text: request.text,
      voice: request.voiceId || "default",
      speed: request.speed || 1.0,
      temperature: 0.3,
    },
    {
      headers,
      responseType: "arraybuffer",
      timeout: 60000,
    }
  );

  return {
    audioBuffer: Buffer.from(response.data),
    duration: Math.round(response.data.length / 16000),
    format: "wav",
  };
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
