import "./type";
import u from "@/utils";
import modelList from "./modelList";
import axios from "axios";

import volcengine from "./owned/volcengine";
import kling from "./owned/kling";
import vidu from "./owned/vidu";
import wan from "./owned/wan";
import runninghub from "./owned/runninghub";
import gemini from "./owned/gemini";
import apimart from "./owned/apimart";
import other from "./owned/other";
import grsai from "./owned/grsai";
import formal from "./owned/formal";

const modelInstance = {
  volcengine: volcengine,
  kling: kling,
  vidu: vidu,
  wan: wan,
  gemini: gemini,
  runninghub: runninghub,
  apimart: apimart,
  other: other,
  grsai: grsai,
  formal: formal,
} as const;

export default async (input: VideoConfig, config?: AIConfig) => {
  const { model, apiKey, baseURL, manufacturer } = { ...config };
  if (!config || !config?.model || !config?.apiKey) throw new Error("请检查模型配置是否正确");

  const manufacturerFn = modelInstance[manufacturer as keyof typeof modelInstance];
  if (!manufacturerFn) throw new Error("不支持的视频厂商");
  // const owned = modelList.find((m) => m.model === model);
  // if (!owned) throw new Error("不支持的模型");
  //添加到任务中心
  // const [taskId] = await u.db("t_myTasks").insert({
  //   taskClass: input.taskClass,
  //   relatedObjects: input.name,
  //   model: config?.model ? config.model : "未知模型",
  //   describe: input.describe ? input.describe : "无",
  //   state: "进行中",
  //   startTime: Date.now(),
  //   projectId: input.projectId,
  // });
  // 补充图片的 base64 内容类型字符串
  if (input.imageBase64 && input.imageBase64.length > 0) {
    input.imageBase64 = input.imageBase64.map((img) => {
      if (img.startsWith("data:image/")) {
        return img;
      }
      // 根据 base64 头部判断图片类型
      if (img.startsWith("/9j/")) {
        return `data:image/jpeg;base64,${img}`;
      }
      if (img.startsWith("iVBORw")) {
        return `data:image/png;base64,${img}`;
      }
      if (img.startsWith("R0lGOD")) {
        return `data:image/gif;base64,${img}`;
      }
      if (img.startsWith("UklGR")) {
        return `data:image/webp;base64,${img}`;
      }
      // 默认使用 png
      return `data:image/png;base64,${img}`;
    });
  }

  let videoUrl = await manufacturerFn(input, { model, apiKey, baseURL });
  if (videoUrl) {
    try {
      const response = await axios.get(videoUrl, { responseType: "stream" });
      await u.oss.writeFile(input.savePath, response.data);
      // await u.db("t_myTasks").where("id", taskId).update({
      //   state: "已完成",
      // });
      return input.savePath;
    } catch (err: any) {
      // await u.db("t_myTasks").where("id", taskId).update({
      //   state: "生成失败",
      //   reason: err.message,
      // });
      return videoUrl;
    }
  }
  return videoUrl;
};
