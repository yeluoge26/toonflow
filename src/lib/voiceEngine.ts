import u from "@/utils";
import axios from "axios";

export interface VoiceProfile {
  id?: number;
  characterId: number;
  projectId: number;
  gender: string;
  ageRange: string;
  pitch: string;
  quality: string;
  provider: string;
  voiceId: string;
  apiKey?: string;
  createdAt?: number;
}

export interface EmotionConfig {
  emotion: string;
  speed: number;
  pitch: number;
  breathiness: boolean;
  pause: number;
}

export function detectEmotion(text: string, context?: string): EmotionConfig {
  const lower = text.toLowerCase();
  if (/哭|泪|悲|痛|伤心|难过/.test(text)) return { emotion: "crying", speed: 0.85, pitch: -3, breathiness: true, pause: 500 };
  if (/怒|愤|气|吼|骂|混蛋/.test(text)) return { emotion: "angry", speed: 1.2, pitch: 3, breathiness: false, pause: 200 };
  if (/笑|开心|高兴|喜|嘿|哈/.test(text)) return { emotion: "happy", speed: 1.1, pitch: 2, breathiness: false, pause: 300 };
  if (/怕|恐|颤|抖|害/.test(text)) return { emotion: "fearful", speed: 0.9, pitch: 1, breathiness: true, pause: 400 };
  if (/悄|轻|嘘|低声|耳语/.test(text)) return { emotion: "whispering", speed: 0.8, pitch: -2, breathiness: true, pause: 600 };
  return { emotion: "neutral", speed: 1.0, pitch: 0, breathiness: false, pause: 300 };
}

export async function generateVoice(text: string, profile: VoiceProfile, emotion: EmotionConfig): Promise<Buffer | null> {
  switch (profile.provider) {
    case "cosyvoice":
      return generateCosyVoice(text, profile, emotion);
    case "fish_speech":
      return generateFishSpeech(text, profile, emotion);
    default:
      return null;
  }
}

async function generateCosyVoice(text: string, profile: VoiceProfile, emotion: EmotionConfig): Promise<Buffer | null> {
  try {
    const apiKey = profile.apiKey || process.env.COSYVOICE_API_KEY;
    if (!apiKey) return null;
    const res = await axios.post("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/text-synthesis", {
      model: "cosyvoice-v1",
      input: { text },
      parameters: {
        voice: profile.voiceId || "longxiaochun",
        rate: emotion.speed,
        format: "mp3",
      },
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      responseType: "arraybuffer",
      timeout: 30000,
    });
    return Buffer.from(res.data);
  } catch (e) {
    console.error("[CosyVoice] Error:", e);
    return null;
  }
}

async function generateFishSpeech(text: string, profile: VoiceProfile, emotion: EmotionConfig): Promise<Buffer | null> {
  try {
    const baseUrl = profile.apiKey || "http://127.0.0.1:8080";
    const res = await axios.post(`${baseUrl}/v1/tts`, {
      text,
      reference_id: profile.voiceId,
      speed: emotion.speed,
      format: "mp3",
    }, { responseType: "arraybuffer", timeout: 30000 });
    return Buffer.from(res.data);
  } catch (e) {
    console.error("[FishSpeech] Error:", e);
    return null;
  }
}

export async function loadVoiceProfile(characterId: number): Promise<VoiceProfile | null> {
  return u.db("t_voice_profile").where("characterId", characterId).first();
}

export async function saveVoiceProfile(profile: VoiceProfile) {
  const data = { ...profile, createdAt: profile.createdAt || Date.now() };
  delete data.id;
  if (profile.id) {
    await u.db("t_voice_profile").where("id", profile.id).update(data);
    return profile.id;
  }
  const [id] = await u.db("t_voice_profile").insert(data);
  return id;
}

export async function batchGenerateDialogue(dialogues: Array<{ text: string; characterId: number; context?: string }>): Promise<Array<{ text: string; audio: Buffer | null; emotion: EmotionConfig }>> {
  const results = [];
  for (const d of dialogues) {
    const profile = await loadVoiceProfile(d.characterId);
    const emotion = detectEmotion(d.text, d.context);
    let audio: Buffer | null = null;
    if (profile) {
      audio = await generateVoice(d.text, profile, emotion);
    }
    results.push({ text: d.text, audio, emotion });
  }
  return results;
}
