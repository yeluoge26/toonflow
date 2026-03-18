import esbuild from "esbuild";
import fs from "fs";
import path from "path";

// 打包默认使用 prod 环境变量
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "prod";
}

// 自动创建 env 目录和环境变量文件（.gitignore 可能忽略了这些文件）
const envDir = path.resolve("env");
const envFile = path.join(envDir, `.env.${process.env.NODE_ENV}`);
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}
if (!fs.existsSync(envFile)) {
  const defaultEnv = `NODE_ENV=${process.env.NODE_ENV}\nPORT=60000\nOSSURL=http://127.0.0.1:60000/\n`;
  fs.writeFileSync(envFile, defaultEnv, "utf8");
  console.log(`📄 已自动创建环境变量文件: ${envFile}`);
}

const external = ["electron", "sqlite3", "better-sqlite3", "mysql", "mysql2", "pg", "pg-query-stream", "oracledb", "tedious", "mssql"];

// 后端服务打包配置
const appBuildConfig: esbuild.BuildOptions = {
  entryPoints: ["src/app.ts"],
  bundle: true,
  minify: false,
  format: "cjs",
  allowOverwrite: true,
  outfile: `build/app.js`,
  platform: "node",
  target: "esnext",
  tsconfig: "./tsconfig.json",
  alias: {
    "@": "./src",
  },
  sourcemap: false,
  external,
};

// Electron 主进程打包配置
const mainBuildConfig: esbuild.BuildOptions = {
  entryPoints: ["scripts/main.ts"],
  bundle: true,
  minify: false,
  format: "cjs",
  outfile: `build/main.js`,
  allowOverwrite: true,
  platform: "node",
  target: "esnext",
  tsconfig: "./tsconfig.json",
  alias: {
    "@": "./src",
  },
  sourcemap: false,
  external,
};

(async () => {
  try {
    console.log("🔨 开始构建...\n");

    // 并行构建
    await Promise.all([esbuild.build(appBuildConfig), esbuild.build(mainBuildConfig)]);

    console.log("✅ 后端服务构建完成: build/app.js");
    console.log("✅ Electron主进程构建完成: build/main.js");

    // Worker builds
    const workerEntries = [
      "src/workers/script.worker.ts",
      "src/workers/storyboard.worker.ts",
      "src/workers/image.worker.ts",
      "src/workers/video.worker.ts",
      "src/workers/voice.worker.ts",
      "src/workers/score.worker.ts",
    ];

    const commonWorkerConfig: esbuild.BuildOptions = {
      bundle: true,
      minify: false,
      format: "cjs",
      allowOverwrite: true,
      platform: "node",
      target: "esnext",
      tsconfig: "./tsconfig.json",
      alias: {
        "@": "./src",
      },
      sourcemap: false,
      external,
    };

    for (const entry of workerEntries) {
      await esbuild.build({
        ...commonWorkerConfig,
        entryPoints: [entry],
        outdir: "build/workers",
      });
    }

    console.log(`✅ Workers构建完成: ${workerEntries.length} workers -> build/workers/`);
    console.log("\n🎉 所有构建任务完成!\n");
  } catch (err) {
    console.error("❌ 构建失败:", err);
    process.exit(1);
  }
})();
