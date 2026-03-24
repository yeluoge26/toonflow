<p align="center">
  <a href="https://github.com/HBAI-Ltd/Toonflow-app">
    <img src="https://img.shields.io/badge/Original_Project-HBAI--Ltd/Toonflow--app-blue?style=for-the-badge&logo=github" alt="Original Project" />
  </a>
  &nbsp;
  <a href="https://github.com/yeluoge26/toonflow">
    <img src="https://img.shields.io/badge/Enhanced_Edition-yeluoge26/toonflow-purple?style=for-the-badge&logo=github" alt="Enhanced Edition" />
  </a>
  &nbsp;
  <a href="https://gitee.com/HBAI-Ltd/Toonflow-app">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee" />
  </a>
</p>

> **Fork 自 [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app)**
> — 感谢 [HBAI-Ltd](https://github.com/HBAI-Ltd) 团队开源了如此优秀的 AI 短剧创作工具，本项目在其基础上进行了深度增强与扩展。原项目采用 AGPL-3.0 协议，本增强版遵循相同协议。

<p align="center">
  <strong>中文</strong> |
  <a href="./docs/README.en.md">English</a>
</p>

<div align="center">

<img src="./docs/logo.png" alt="Toonflow Logo" height="120"/>

# Toonflow (Enhanced Edition)

  <p align="center">
    <b>
      AI 短剧工厂 — 增强版
      <br />
      小说一键变剧集，全流程 AI 自动化
      <br />
      多模型 Fallback × 专业分镜 × Gemini/Kling/Wan2.5 × 管理后台
    </b>
  </p>
  <p align="center">
    <a href="https://github.com/yeluoge26/toonflow/stargazers">
      <img src="https://img.shields.io/github/stars/yeluoge26/toonflow?style=for-the-badge&logo=github" alt="Stars Badge" />
    </a>
    <a href="https://www.gnu.org/licenses/agpl-3.0" target="_blank">
      <img src="https://img.shields.io/badge/License-AGPL-blue.svg?style=for-the-badge" alt="AGPL License Badge" />
    </a>
    <a href="https://github.com/HBAI-Ltd/Toonflow-app">
      <img src="https://img.shields.io/badge/Upstream-HBAI--Ltd-green?style=for-the-badge&logo=git" alt="Upstream" />
    </a>
  </p>
</div>

---

## 致谢

本项目基于 **[HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app)** 开源项目深度增强。特别感谢：

- **[HBAI-Ltd](https://github.com/HBAI-Ltd)** — 原始项目作者团队，构建了完整的 AI 短剧创作框架
- **原项目贡献者** — 为 Toonflow 的核心功能（小说解析、剧本生成、分镜制作、视频合成）奠定了坚实基础
- **开源社区** — AI SDK、BullMQ、Prisma 等优秀开源项目

> 如果你喜欢这个项目，请也给原项目 [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app) 一个 Star！

---

# 🆕 增强版新增功能（vs 原版对比）

> 基于 [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app) 原版深度增强，以下为改版新增/优化的完整清单。

## 与原版核心差异

| 模块 | 原版 | 增强版 |
|------|------|--------|
| **图片生成** | 仅支持单一在线模型 | Gemini / SD 本地 / ModelScope Z-Image 多引擎 |
| **视频生成** | 基础对接 | Kling / Wan2.5 / 火山引擎多模型，图生视频 |
| **分镜格式** | 简单提示词 | 专业短剧分镜脚本（duration/role/location/对白/音效/过渡） |
| **模型管理** | 单模型配置 | Fallback 机制（主/备/三号模型），防欠费自动切换 |
| **一致性控制** | 无 | 角色/背景/风格三维收敛 Prompt |
| **成本控制** | 仅预算上限 | 按模型计费（token/张/秒），用量追踪，计费标准可编辑 |
| **管理后台** | 无 | 12 模块可视化控制台（项目/队列/模型/成本/GPU...） |
| **前端整合** | 需单独部署前端 | Portal + Admin 一体化，无需额外前端部署 |
| **队列系统** | 无 | BullMQ + Redis 分布式任务队列 |
| **视频拼接** | 无 | ffmpeg 自动合成完整剧集 |
| **风格系统** | 6 种基础风格 | 20+ 种 AI 动画风格预设（龙族传说/吉卜力/赛博朋克...） |
| **一句话生成** | 无 | 输入灵感 → 完整项目一键生成 |
| **导演编辑器** | 无 | Timeline 可视化编辑器（类剪映） |
| **防跑偏规则** | 无 | 6 维锁定（灯光/人物/镜头/收敛/前缀/设定） |
| **角色一致性** | 无 | seed 固化 + LoRA + Character Lock |
| **状态机** | 无 | 12 阶段流水线 + 断点续跑 |
| **安全加固** | 硬编码密码 | bcrypt 哈希 + helmet + 限流 + JWT 256bit + CORS 真拦截 |
| **移动端** | 无 | React Native PWA (`/m/`) 手机创作+导出 |
| **内容审核** | 无 | fail-close 模式 + 关键词屏蔽 |
| **测试** | 无 | vitest + 53 测试用例 |
| **AI 导演系统** | 无 | 节奏分析 + 情绪曲线 + 爆款评分 + 5条导演规则 |
| **Prompt 优化** | 手写 prompt | AI 自动优化（简单描述→电影级 prompt） |
| **模型路由** | 手动选择 | 15模型智能选择 + 健康监控 + 4维评分 |
| **Sora 接入** | 无 | Sora 网页反代 Provider，兼容多种反代协议 |
| **API 数量** | 82 | 187+ |

## 新增功能详细列表

### 1. 多模型图片生成引擎

- **Gemini 2.5 Flash Image** — 高质量 AI 图片生成，支持 16:9 / 9:16 / 1:1
- **Stable Diffusion 本地** — 零成本本地生成，SDXL 高分辨率
- **ModelScope Z-Image** — 阿里通义万相，云端备选
- 三引擎可配置优先级，自动 Fallback

### 2. 多模型视频生成

- **Kling (可灵)** — 快手图生视频，5s 高质量
- **Wan2.5** — 阿里万相视频，支持图生视频 + 文生视频
- **火山引擎 / Vidu / RunningHub** — 更多视频模型对接
- 视频自动下载到本地持久化存储

### 3. 专业分镜脚本系统

```
画面风格和类型: 龙族传说, 仙侠
场景: <location>天宫陵水殿</location>
分镜过渡: 溶解过渡

分镜1<duration-ms>4000</duration-ms>: 时间：夜，场景图片：<location>天宫陵水殿</location>。
  大远景俯拍，<role>洛轻云</role>蜷缩在金砖角落...
  环境音：丝竹余韵，仙鹤振翅声。

分镜2<duration-ms>5000</duration-ms>: ...
  <role>洛轻云</role>说：「我不需要你的施舍。」
  音色：女声，青年音色，带压抑颤音。
```

- `<role>` / `<location>` / `<duration-ms>` 标签化引用
- 每镜头含：景别、机位、构图、运动、对白、音效
- 时长精确到毫秒，支持 2-6 秒/镜头
- 过渡方式：硬切 / 溶解 / 淡入淡出

### 4. 一致性收敛系统

| 维度 | 约束内容 |
|------|----------|
| **角色一致性** | 面部特征、体型比例、服装细节、色彩、姿态习惯 |
| **背景一致性** | 光照方向、建筑风格、色彩分级、环境细节、景深 |
| **风格一致性** | 渲染技法、线条粗细、阴影处理、色板收敛、细节密度 |

管理后台可编辑覆盖默认 Prompt。

### 5. 模型 Fallback 机制

```
主模型 (qwen-plus) → 备用模型 (deepseek) → 三号模型 (gemini)
         ↓ 失败/超时/欠费              ↓ 失败
      自动切换                       自动切换
```

- 每个模块（文本/图片/视频）独立配置主/备/三号模型
- 自动检测欠费、限流、超时，无缝切换
- 防止单点故障导致全流程中断

### 6. 管理后台控制台

12 模块可视化管理（`/admin.html`）：

| 模块 | 功能 |
|------|------|
| Dashboard | 系统概览、CPU/内存/GPU、Token 用量 |
| 项目管理 | 项目列表、流水线进度、剧本状态 |
| 模型配置 | 多模型管理、Fallback 配置、API Key |
| 成本控制 | 按模型计费、用量明细、预算管理 |
| 队列监控 | BullMQ 任务状态、运行/等待/完成 |
| 批量生产 | 批次创建、进度追踪 |
| 提示词管理 | 系统 Prompt 编辑、一致性 Prompt |
| 分发管理 | 发布历史、推荐 |
| 模板系统 | 爆款模板管理 |
| 系统状态 | Redis/GPU/磁盘监控 |

### 7. 视频拼接与合成

- ffmpeg 自动按集拼接所有镜头视频
- 支持统一分辨率/编码校验
- 输出完整剧集 MP4 文件

### 8. 20+ AI 动画风格预设

2D动漫 | 真人写实 | 3D国创 | 三渲二 | 日式少女漫 | 龙族传说 | 吉卜力 | 复古赛璐璐 | 韩式厚涂 | 美式漫画 | 美式3D | 空灵哥特 | 柔光原画 | 通透光影 | 80s年代 | 水墨国风 | 赛博朋克 | 油画风 | 可爱Q版 | 暗黑奇幻

### 9. BullMQ 分布式队列

- Redis + BullMQ 异步任务处理
- 支持 Worker 横向扩展
- 任务优先级、重试、超时控制

### 10. 前端一体化 + 移动端

**桌面端：**
- `/` — Portal 统一入口页
- `/admin.html` — 管理控制台
- `/timeline.html` — Timeline 导演编辑器
- `/index.html` — Vue SPA 创作工作台
- 无需单独部署前端项目

**移动端（`/m/`）：**
- React Native (Expo) 构建的 PWA 移动版
- 支持手机/平板浏览器直接访问
- 核心功能：一句话创作 → 浏览剧本 → 导出收敛 Prompt
- 深色主题 UI，触控优化
- 登录/项目列表/剧本浏览/资产查看
- 一键导出带角色锁定 + 防跑偏规则的完整 Prompt

```
手机访问: http://your-server:60000/m/
```

### 11. 一句话生成剧本

```
输入: "一个调酒师和失恋女孩在酒吧相遇的故事"
  ↓ AI 自动完成以下全部步骤
✅ 创建项目 → ✅ 故事线 → ✅ 5集大纲 → ✅ 5集剧本 → ✅ 角色/场景/道具提取
  ↓
输出: 完整项目，可直接进入分镜和图片生成
```

- SSE 实时进度推送
- 可配置集数（3/5/8/10）、风格、类型
- 支持管理后台和 Portal 两个入口

### 12. Timeline 导演模式编辑器

类剪映/CapCut 的可视化导演工作台（`/timeline.html`）：

- **Timeline 轨道** — 水平滚动，拖拽排序，拖拽边缘调整时长
- **镜头属性面板** — 景别/运镜/情绪/过渡/时长/对白/音效
- **角色/场景面板** — 左侧拖拽角色进镜头
- **10+ 镜头模板** — 情绪特写/全景建立/推镜/对话/沉默/转场等
- **导出** — Storyboard DSL JSON

### 13. 工业级防跑偏引擎

6 大锁定规则（`/project/saveAntiDrift`）：

| 规则 | 作用 |
|------|------|
| **灯光锁死** | 全局光照/色温/阴影方向固定，跨镜头不变 |
| **人物进入规则** | 限制每镜头最大角色数，禁止随机路人 |
| **镜头限制** | 允许的景别/运镜白名单，禁止急速运动 |
| **核心收敛词** | 每条 Prompt 强制附加的质量/一致性关键词 |
| **统一前缀** | 图片/视频 Prompt 统一前缀注入 |
| **人物设定锁** | 每角色固定服装/发型/配饰/seed |

### 14. 角色一致性系统

- Character Identity 数据库（面部/体型/发型/服装/色板/seed）
- AI 自动提取角色特征（从已有图片分析）
- 参考图生成（正面/侧面/背面三视图）
- LoRA / IP-Adapter 权重配置
- 自动注入 `[CHARACTER LOCK]` 到每张分镜图生成

### 15. 统一任务状态机

12 阶段流水线，支持断点续跑：

```
idea → storyline → outline → script → assets → storyboard
  → image → video → audio → compose → review → publish
```

- 每阶段独立状态：pending / running / success / failed / cancelled / skipped
- 幂等性：已完成阶段自动跳过
- 失败恢复：最多 5 次重试，支持手动重置
- API: `getPipelineState` / `retryStage` / `skipStage` / `resetStage`

### 16. 工业级安全加固

- **bcrypt 密码哈希** — 所有密码 bcrypt 存储，旧明文自动迁移
- **helmet.js 安全头** — XSS/Clickjacking/MIME 嗅探防护
- 随机初始密码，首次登录强制修改
- 登录限流（5 次/15 分钟/IP）
- JWT 256-bit 密钥 + 7 天过期（可选 30 天记住我）
- CORS 可通过 `CORS_ORIGINS` 环境变量收紧（生产环境真拦截）
- 敏感操作（清空数据库）仅管理员可执行
- Token 仅通过 Header 传递，不支持 URL 查询参数（防泄露）
- 内容审核 fail-close 模式（生产环境默认）
- 用户列表接口不返回密码字段

### 17. AI 导演系统（V2 核心）

从"生成工具"升级为"AI 导演系统"——不只是生成，而是**控制**内容质量和留存率。

#### AI 导演 Agent (`/director/analyzeScript` + `/director/generatePlan`)

```
输入: 剧本文本
  ↓ analyzeScript
节奏曲线(0-100) + 情绪节拍 + 高潮点 + 切镜建议
  ↓ generatePlan
完整镜头计划: 景别/运镜/镜头(24-135mm)/景深/构图/过渡/prompt
  ↓ applyRhythmRules
5条专业导演规则自动校正
  ↓ scoreViralPotential
爆款潜力评分(0-100): hook强度 + 节奏多样性 + 情绪峰值 + 结尾记忆度
```

**5 条导演规则（自动强制执行）：**
1. **前 3 秒必须 Hook** — 动态镜头 + 高强度情绪 + 特写
2. **高潮前加速** — 缩短镜头时长，增加切镜频率
3. **情感戏减速** — 延长镜头 + 浅景深 + 特写
4. **每 3-5 秒视觉变化** — 防止观众流失
5. **结尾记忆点** — 慢镜头 + 淡出 + 音乐渐强

**4 种类型预设：** 韩剧 / 港风 / 仙侠 / 赛博朋克

#### Prompt 优化器 (`/director/optimizePrompt`)

```
输入: "女生回头"
输出: "beautiful young woman turning her head, cinematic close-up,
       50mm lens, shallow depth of field f/1.8, warm amber side lighting,
       korean drama aesthetic, emotional expression with glistening eyes,
       soft background bokeh, professional color grading, masterpiece"
```

- 40+ 中英文视觉词典自动映射
- 批量优化保持风格一致
- 支持 CHARACTER LOCK 注入

#### 智能模型路由器 (`/system/modelHealth`)

- 15 个模型注册（Gemini/SD/ModelScope/Kling/Wan/Sora/OpenAI/DeepSeek...）
- 质量/速度/成本/专项 4 维评分
- 实时健康监控（延迟/错误率/状态）
- 自动选择最优模型

### 18. Sora 网页反代接入

支持通过反向代理接入 OpenAI Sora 网页版：

```
配置: manufacturer=sora, baseUrl=提交URL|查询URL
兼容: OpenAI 兼容格式 / 原生 Sora Web API
自动: 下载视频到本地持久化
```

### 19. 成本控制台账

- 按项目/批次/模型/步骤持久化到数据库
- 支持预算拦截（超支自动阻断）
- 计费标准可编辑（文本=百万token / 图片=张 / 视频=秒）
- 进程重启不丢数据

### 20. 批量生产引擎 + AI 配音

- 模板驱动批量生成（50集/批次）
- 变体系统（同模板不同剧情/情绪）
- 情绪感知 TTS（自动检测哭泣/愤怒/低语等情绪）
- CosyVoice / FishSpeech 双引擎
- 角色独立音色绑定

---

# 🌟 主要功能

Toonflow 是一款 AI 工具，能够利用 AI 技术将小说自动转化为剧本，并结合 AI 生成的图片和视频，实现高效的短剧创作。借助 Toonflow，可以轻松完成从文字到影像的全流程，让短剧制作变得更加智能与便捷。

- ✅ **角色生成**
   自动分析原始小说文本，智能识别并生成角色设定，包括外貌、性格、身份等详细信息，为后续剧本与画面创作提供可靠基础。
- ✅ **剧本生成**
   基于选定事件和章节，系统自动生成结构化剧本，涵盖对白、场景描述、剧情走向，实现从文学文本到影视剧本的高效转换。
- ✅ **分镜制作**
   根据剧本内容，智能生成分镜提示词与画面设计，细化前中后景、角色动态、道具设定和场景布局，自动根据剧本生成分镜，为视频制作提供完整路线蓝图。
- ✅ **视频合成**
   集成 AI 图像与视频技术，可使用 AI 生成视频片段。整合在线编辑，支持个性化调整输出，让影视创作高效协同、快捷落地。

---

# 📦 应用场景

- 短视频内容创作
- 小说影视化实验
- AI 文学改编工具
- 剧本开发与快速原型
- 视频素材生成

---

# 🚀 安装

## 前置条件

- ✅ Node.js 24.x+
- ✅ Redis（BullMQ 队列需要）
- ✅ 大语言模型 API Key（Qwen / DeepSeek / Gemini 等任选）
- ✅ 图片模型（Gemini / SD 本地 / ModelScope 任选）
- ✅ 视频模型（Kling / Wan2.5 任选，可选）
- ✅ ffmpeg（视频拼接，可选）

## 快速开始

```bash
# 克隆项目
git clone https://github.com/yeluoge26/toonflow.git
cd toonflow

# 安装依赖
yarn install

# 启动 Redis（Docker 方式）
docker run -d --name toonflow-redis -p 6379:6379 --restart unless-stopped redis:7-alpine

# 启动开发服务
yarn dev
```

访问 `http://localhost:60000` 即可使用。

> ⚠️ **首次登录** — 账号：`admin`，密码为系统自动生成的随机密码，请查看首次启动时的控制台输出获取。登录后系统会提示强制修改密码。

## Docker 部署

```shell
# 在线部署
docker-compose -f docker/docker-compose.yml up -d --build

# 本地构建
docker-compose -f docker/docker-compose.local.yml up -d --build
```

## 云端部署

```bash
# 安装环境
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 24
npm install -g yarn pm2

# 部署
cd /opt
git clone https://github.com/yeluoge26/toonflow.git
cd toonflow
yarn install && yarn build

# 启动
pm2 start ecosystem.config.js
pm2 startup && pm2 save
```

---

# 🏗️ 项目结构

```
📂 docker/                   # Docker 配置
📂 docs/                     # 文档资源
📂 prisma/                   # Prisma ORM (SQLite)
📂 scripts/
│  └─ 📂 web/                # 前端资源（Portal + Admin）
│     ├─ portal.html          # 统一入口页
│     ├─ admin.html           # 管理控制台
│     └─ index.html           # Vue SPA
📂 src/
├─ 📂 agents/                # AI Agent
│  ├─ 📂 outlineScript/      #   大纲+剧本 Agent
│  ├─ 📂 storyboard/         #   分镜 Agent
│  │  ├─ generateImageTool.ts #     图片生成（含一致性注入）
│  │  └─ generateImagePromptsTool.ts
│  └─ 📂 director/           #   导演审核 Agent
├─ 📂 lib/
│  ├─ costControl.ts          # 成本控制
│  ├─ resourceMonitor.ts      # 资源监控（CPU/内存/GPU）
│  ├─ cache.ts                # Redis 缓存
│  ├─ taskQueue.ts            # BullMQ 任务队列
│  └─ initDB.ts               # 数据库初始化
├─ 📂 nest/                   # NestJS 模块（Worker）
├─ 📂 queue/                  # Redis/BullMQ 连接
├─ 📂 routes/
│  ├─ 📂 cost/                # 成本控制 API
│  ├─ 📂 setting/             # 模型配置 API
│  └─ ...                     # 其他路由
├─ 📂 utils/
│  └─ 📂 ai/
│     ├─ 📂 image/            # 图片生成（SD/Gemini/ModelScope）
│     └─ 📂 video/owned/      # 视频生成（Kling/Wan/火山/Vidu）
├─ app.ts                     # Express 入口
├─ router.ts                  # 路由注册
└─ env.ts                     # 环境变量
📂 uploads/                   # 文件存储
│  └─ {projectId}/
│     ├─ role/                # 角色图
│     ├─ scene/               # 场景图
│     ├─ props/               # 道具图
│     ├─ storyboard/          # 分镜图
│     ├─ video/               # 视频文件
│     └─ sample/              # 风格样图
```

---

# 🔧 开发

```bash
yarn dev          # 后端开发（热重载）
yarn dev:gui      # Electron 桌面端
yarn lint         # 类型检查
yarn build        # 编译
yarn dist:win     # 打包 Windows
yarn dist:mac     # 打包 Mac
yarn dist:linux   # 打包 Linux
yarn debug:ai     # AI SDK 调试面板
```

---

# 🔗 相关仓库

| 仓库 | 说明 | GitHub | Gitee |
|------|------|--------|-------|
| **Toonflow-app** | 完整客户端（本仓库） | [GitHub](https://github.com/HBAI-Ltd/Toonflow-app) | [Gitee](https://gitee.com/HBAI-Ltd/Toonflow-app) |
| **Toonflow-web** | 前端源代码 | [GitHub](https://github.com/HBAI-Ltd/Toonflow-web) | [Gitee](https://gitee.com/HBAI-Ltd/Toonflow-web) |

---

# 📜 许可证

Toonflow 基于 AGPL-3.0 协议开源发布。详情：https://www.gnu.org/licenses/agpl-3.0.html

---

# ⭐️ 星标历史

[![Star History Chart](https://api.star-history.com/svg?repos=HBAI-Ltd/Toonflow-app&type=timeline&legend=top-left)](https://www.star-history.com/#HBAI-Ltd/Toonflow-app&type=timeline&legend=top-left)
