import "./logger";
import "./err";
import "./env";
import express, { Request, Response, NextFunction } from "express";
import expressWs from "express-ws";
import logger from "morgan";
import cors from "cors";
import buildRoute from "@/core";
import fs from "fs";
import path from "path";
import u from "@/utils";
import jwt from "jsonwebtoken";

const app = express();
let server: ReturnType<typeof app.listen> | null = null;

export default async function startServe(randomPort: Boolean = false) {
  if (process.env.NODE_ENV == "dev") await buildRoute();

  expressWs(app);

  app.use(logger("dev"));
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  let rootDir: string;
  if (typeof process.versions?.electron !== "undefined") {
    const { app } = require("electron");
    const userDataDir: string = app.getPath("userData");
    rootDir = path.join(userDataDir, "uploads");
  } else {
    rootDir = path.join(process.cwd(), "uploads");
  }

  // 确保 uploads 目录存在
  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }
  console.log("文件目录:", rootDir);

  app.use(express.static(rootDir));

  // Frontend files - served before auth middleware
  const webDir = path.join(typeof process.versions?.electron !== "undefined"
    ? path.dirname(require("electron").app.getAppPath())
    : process.cwd(), "scripts", "web");
  app.use("/favicon.ico", express.static(path.join(webDir, "favicon.ico")));
  app.use("/admin.html", express.static(path.join(webDir, "admin.html")));
  app.use("/timeline.html", express.static(path.join(webDir, "timeline.html")));
  // Serve index.html with dynamic URL replacement (fix localhost for remote deploy)
  app.get("/index.html", (req, res) => {
    const indexPath = path.join(webDir, "index.html");
    if (!fs.existsSync(indexPath)) return res.status(404).send("Not Found");
    let html = fs.readFileSync(indexPath, "utf-8");
    const host = req.headers.host || "localhost:60000";
    html = html.replace(/http:\/\/localhost:60000/g, `http://${host}`);
    html = html.replace(/ws:\/\/localhost:60000/g, `ws://${host}`);
    res.type("html").send(html);
  });
  // Unified portal as root entry
  app.get("/", (req, res) => {
    res.sendFile(path.join(webDir, "portal.html"));
  });

  app.use(async (req, res, next) => {
    const setting = await u.db("t_setting").where("id", 1).select("tokenKey").first();
    if (!setting) return res.status(500).send({ message: "服务器未配置，请联系管理员" });
    const { tokenKey } = setting;
    // 从 header 或 query 参数获取 token
    const rawToken = req.headers.authorization || (req.query.token as string) || "";
    const token = rawToken.replace("Bearer ", "");
    // 白名单路径
    if (req.path === "/other/login") return next();

    if (!token) return res.status(401).send({ message: "未提供token" });
    try {
      const decoded = jwt.verify(token, tokenKey as string);
      (req as any).user = decoded;
      next();
    } catch (err) {
      return res.status(401).send({ message: "无效的token" });
    }
  });

  // Register task handlers (audio TTS, etc.)
  const { registerTaskHandlers } = await import("@/lib/taskHandlers");
  registerTaskHandlers();

  const router = await import("@/router");
  await router.default(app);

  // 404 处理
  app.use((_, res, next: NextFunction) => {
    return res.status(404).send({ message: "Not Found" });
  });

  // 错误处理
  app.use((err: any, _: Request, res: Response, __: NextFunction) => {
    res.locals.message = err.message;
    res.locals.error = err;
    console.error(err);
    res.status(err.status || 500).send(err);
  });

  const port = randomPort ? 0 : parseInt(process.env.PORT || "60000");
  return await new Promise((resolve, reject) => {
    server = app.listen(port, async (v) => {
      const address = server?.address();
      const realPort = typeof address === "string" ? address : address?.port;
      console.log(`[服务启动成功]: http://localhost:${realPort}`);
      resolve(realPort);
    });
  });
}

// 支持await关闭
export function closeServe(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err?: Error) => {
        if (err) return reject(err);
        console.log("[服务已关闭]");
        resolve();
      });
    } else {
      resolve();
    }
  });
}

const isElectron = typeof process.versions?.electron !== "undefined";
if (!isElectron) startServe();
