export interface AudioModel {
  manufacturer: string;
  model: string;
  voices: string[];           // available voice IDs
  supportEmotion: boolean;
  supportClone: boolean;      // voice cloning support
  maxTextLength: number;
  outputFormats: string[];
}

export const audioModelList: AudioModel[] = [
  {
    manufacturer: "cosyvoice",
    model: "cosyvoice-v2",
    voices: ["default"],
    supportEmotion: true,
    supportClone: true,
    maxTextLength: 5000,
    outputFormats: ["mp3", "wav"],
  },
  {
    manufacturer: "chattts",
    model: "chattts",
    voices: ["default"],
    supportEmotion: true,
    supportClone: false,
    maxTextLength: 2000,
    outputFormats: ["wav"],
  },
  {
    manufacturer: "fishspeech",
    model: "fish-speech-1.5",
    voices: ["default"],
    supportEmotion: true,
    supportClone: true,
    maxTextLength: 10000,
    outputFormats: ["mp3", "wav"],
  },
  {
    manufacturer: "openai",
    model: "tts-1-hd",
    voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    supportEmotion: false,
    supportClone: false,
    maxTextLength: 4096,
    outputFormats: ["mp3", "opus", "aac", "flac"],
  },
];
