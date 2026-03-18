import express from "express";
import expressWs, { Application } from "express-ws";
import u from "@/utils";
import Storyboard from "@/agents/storyboard";
const router = express.Router();
expressWs(router as unknown as Application);

// 分镜对话Agent
router.ws("/", async (ws, req) => {
  let agent: Storyboard;


  const projectId = req.query.projectId;
  const scriptId = req.query.scriptId;
  if (!projectId || typeof projectId !== "string" || !scriptId || typeof scriptId !== "string") {
    ws.send(JSON.stringify({ type: "error", data: "项目ID或脚本ID缺失" }));
    ws.close(500, "项目ID或脚本ID缺失");
    return;
  }

  agent = new Storyboard(Number(projectId), Number(scriptId));

  const existing = await u
    .db("t_chatHistory")
    .where({ projectId: Number(projectId) })
    .first();
  if (existing) {
    try {
      agent.history = JSON.parse(existing.data!);
      agent.novelChapters = existing.novel ? JSON.parse(existing.novel) : [];
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", data: "历史记录解析异常,将清空历史记录" }));
      agent.history = [];
    }
  }
  // 监听各类事件
  // 流式传输：每个token
  agent.emitter.on("data", (text) => {
    ws.send(JSON.stringify({ type: "stream", data: text }));
  });

  // 完整响应结束
  agent.emitter.on("response", async (text) => {
    ws.send(JSON.stringify({ type: "response_end", data: text }));
    await saveHistory();
  });

  // Sub-Agent 流式数据
  agent.emitter.on("subAgentStream", (data) => {
    ws.send(JSON.stringify({ type: "subAgentStream", data }));
  });

  // Sub-Agent 结束
  agent.emitter.on("subAgentEnd", (data) => {
    ws.send(JSON.stringify({ type: "subAgentEnd", data }));
  });

  // Tool 调用
  agent.emitter.on("toolCall", (data) => {
    ws.send(JSON.stringify({ type: "toolCall", data }));
  });

  agent.emitter.on("transfer", (data) => {
    ws.send(JSON.stringify({ type: "transfer", data }));
  });

  agent.emitter.on("refresh", (data) => {
    ws.send(JSON.stringify({ type: "refresh", data }));
  });

  agent.emitter.on("error", (err) => {
    ws.send(JSON.stringify({ type: "error", data: err.toString() }));
  });

  // 片段数据更新
  agent.emitter.on("segmentsUpdated", (data) => {
    ws.send(JSON.stringify({ type: "segmentsUpdated", data }));
  });

  // 分镜数据更新
  agent.emitter.on("shotsUpdated", (data) => {
    ws.send(JSON.stringify({ type: "shotsUpdated", data }));
  });

  // 分镜图生成开始
  agent.emitter.on("shotImageGenerateStart", (data) => {
    ws.send(JSON.stringify({ type: "shotImageGenerateStart", data }));
  });

  // 分镜图生成进度
  agent.emitter.on("shotImageGenerateProgress", (data) => {
    ws.send(JSON.stringify({ type: "shotImageGenerateProgress", data }));
  });

  // 分镜图生成完成
  agent.emitter.on("shotImageGenerateComplete", (data) => {
    ws.send(JSON.stringify({ type: "shotImageGenerateComplete", data }));
  });

  // 分镜图生成错误
  agent.emitter.on("shotImageGenerateError", (data) => {
    ws.send(JSON.stringify({ type: "shotImageGenerateError", data }));
  });

  // 发送初始化完成消息，通知前端可以开始发送消息
  ws.send(JSON.stringify({ type: "init", data: { projectId, scriptId } }));

  type DataTyype = "msg" | "cleanHistory" | "generateShotImage" | "replaceShot";
  ws.on("message", async function (rawData: string) {
    let data: { type: DataTyype; data: any } | null = null;

    try {
      data = JSON.parse(rawData);
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", data: "数据解析异常" }));
      ws.close(500, "数据解析异常");
      return;
    }
    if (!data) {
      ws.send(JSON.stringify({ type: "error", data: "数据格式错误" }));
      ws.close(500, "数据格式错误");
      return;
    }
    const msg = data.data;
    try {
      switch (data?.type) {
        case "msg":
          let prompt = msg.data;
          if (msg.type == "user") await agent.call(prompt);
          break;
        case "cleanHistory":
          agent.reset();
          await u
            .db("t_chatHistory")
            .where({ projectId: Number(projectId) })
            .del();
          ws.send(JSON.stringify({ type: "notice", data: "历史记录已清空" }));
          break;
        case "generateShotImage":
          agent.reset();
          await u
            .db("t_chatHistory")
            .where({ projectId: Number(projectId) })
            .del();
          ws.send(JSON.stringify({ type: "notice", data: "历史记录已清空" }));
          break;
        case "replaceShot":
          agent.updatePreShots(msg.segmentId, msg.cellId, msg.cell);
          break;
        default:
          break;
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", data: "数据解析/脚本生成异常" }));
      console.error(e);
    }
  });

  ws.on("close", async () => {
    agent?.destroy();
    await saveHistory();
  });

  async function saveHistory() {
    const history = agent?.history || [];
    //保存对话记录
    const existing = await u
      .db("t_chatHistory")
      .where({ projectId: Number(projectId), type: "storyboardAgent" })
      .first();
    if (existing) {
      await u
        .db("t_chatHistory")
        .where({ projectId: Number(projectId), type: "storyboardAgent" })
        .update({ data: JSON.stringify(history), novel: agent?.novelChapters ? JSON.stringify(agent.novelChapters) : "" });
    } else {
      await u.db("t_chatHistory").insert({
        projectId: Number(projectId),
        data: JSON.stringify(history),
        novel: agent?.novelChapters ? JSON.stringify(agent.novelChapters) : "",
        type: "storyboardAgent",
      });
    }
  }
});

export default router;
