import "../type";
import axios from "axios";

/**
 * Stable Diffusion WebUI (AUTOMATIC1111) provider
 * API docs: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API
 */
export default async (input: ImageConfig, config: AIConfig): Promise<string> => {
  const baseURL = (config.baseURL || "http://127.0.0.1:7860").replace(/\/+$/, "");

  // Map aspectRatio + size to pixel dimensions
  const sizeMap: Record<string, Record<string, [number, number]>> = {
    "16:9": {
      "1K": [1024, 576],
      "2K": [1536, 864],
      "4K": [2048, 1152],
    },
    "9:16": {
      "1K": [576, 1024],
      "2K": [864, 1536],
      "4K": [1152, 2048],
    },
    "1:1": {
      "1K": [1024, 1024],
      "2K": [1536, 1536],
      "4K": [2048, 2048],
    },
  };

  const ratio = input.aspectRatio || "16:9";
  const size = input.size || "1K";
  const dims = sizeMap[ratio]?.[size] || sizeMap["16:9"]["1K"];
  const [width, height] = dims;

  const fullPrompt = input.systemPrompt ? `${input.systemPrompt}, ${input.prompt}` : input.prompt;

  // Check if we have reference images -> use img2img
  const hasRefImages = input.imageBase64 && input.imageBase64.length > 0;

  if (hasRefImages) {
    // img2img mode
    let initImage = input.imageBase64[0];
    // Strip data URI prefix if present
    if (initImage.startsWith("data:")) {
      initImage = initImage.replace(/^data:image\/\w+;base64,/, "");
    }

    const body = {
      prompt: fullPrompt,
      negative_prompt: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, blurry, watermark, signature",
      init_images: [initImage],
      width,
      height,
      steps: 30,
      cfg_scale: 7,
      denoising_strength: 0.6,
      sampler_name: "DPM++ 2M SDE",
      ...(config.model && { override_settings: { sd_model_checkpoint: config.model } }),
    };

    const { data } = await axios.post(`${baseURL}/sdapi/v1/img2img`, body, {
      timeout: 300000,
      ...(config.apiKey && { headers: { Authorization: `Bearer ${config.apiKey}` } }),
    });

    if (!data.images || !data.images[0]) throw new Error("SD img2img 未返回图片");
    return `data:image/png;base64,${data.images[0]}`;
  } else {
    // txt2img mode
    const body = {
      prompt: fullPrompt,
      negative_prompt: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, blurry, watermark, signature",
      width,
      height,
      steps: 30,
      cfg_scale: 7,
      sampler_name: "DPM++ 2M SDE",
      ...(config.model && { override_settings: { sd_model_checkpoint: config.model } }),
    };

    const { data } = await axios.post(`${baseURL}/sdapi/v1/txt2img`, body, {
      timeout: 300000,
      ...(config.apiKey && { headers: { Authorization: `Bearer ${config.apiKey}` } }),
    });

    if (!data.images || !data.images[0]) throw new Error("SD txt2img 未返回图片");
    return `data:image/png;base64,${data.images[0]}`;
  }
};
