<p align="center">
  <a href="https://github.com/HBAI-Ltd/Toonflow-app">
    <img src="https://img.shields.io/badge/Original_Project-HBAI--Ltd/Toonflow--app-blue?style=for-the-badge&logo=github" alt="Original Project" />
  </a>
  &nbsp;
  <a href="https://github.com/yeluoge26/toonflow">
    <img src="https://img.shields.io/badge/Enhanced_Edition-yeluoge26/toonflow-purple?style=for-the-badge&logo=github" alt="Enhanced Edition" />
  </a>
</p>

> **Forked from [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app)**
> — Thanks to the [HBAI-Ltd](https://github.com/HBAI-Ltd) team for open-sourcing such an excellent AI short drama creation tool. This project is a deep enhancement built upon it. Licensed under AGPL-3.0, same as the original.

<p align="center">
  <a href="../README.md">中文</a> |
  <strong>English</strong>
</p>

<div align="center">

<img src="./logo.png" alt="Toonflow Logo" height="120"/>

# Toonflow (Enhanced Edition)

  <p align="center">
    <b>
      AI Short Drama Factory — Enhanced
      <br />
      Novel to Series in One Click, Fully AI-Automated
      <br />
      Multi-Model Fallback × AI Director × Gemini/Kling/Wan2.5/Sora × Admin Console
    </b>
  </p>
</div>

---

## Acknowledgments

This project is deeply enhanced from **[HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app)**. Special thanks to:

- **[HBAI-Ltd](https://github.com/HBAI-Ltd)** — Original project authors who built the complete AI short drama framework
- **Original contributors** — For the core features: novel parsing, script generation, storyboard creation, video synthesis

> If you like this project, please also star the original [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app)!

---

# 🆕 Enhanced Features (vs Original)

| Module | Original | Enhanced Edition |
|--------|----------|-----------------|
| **Image Generation** | Single online model | Gemini / SD Local / ModelScope Z-Image multi-engine |
| **Video Generation** | Basic integration | Kling / Wan2.5 / Volcengine multi-model, image-to-video |
| **Storyboard Format** | Simple prompts | Professional DSL (duration/role/location/dialogue/SFX/transition) |
| **Model Management** | Single config | Fallback mechanism (primary/secondary/tertiary), auto-switch on failure |
| **Consistency Control** | None | Character/Background/Style 3D convergence prompts |
| **Cost Control** | Budget cap only | Per-model billing (token/image/second), usage tracking, editable pricing |
| **Admin Console** | None | 12-module visual dashboard (projects/queue/models/cost/GPU...) |
| **Frontend Integration** | Separate frontend | Portal + Admin unified, no extra frontend deployment needed |
| **Queue System** | None | BullMQ + Redis distributed task queue |
| **Video Composition** | None | ffmpeg auto-merge complete episodes |
| **Style System** | 6 basic styles | 20+ AI animation style presets |
| **One-Sentence Generate** | None | Input idea → complete project auto-generated |
| **Director Editor** | None | Timeline visual editor (CapCut-like) |
| **Anti-Drift Rules** | None | 6D lock (lighting/characters/camera/convergence/prefix/settings) |
| **Character Consistency** | None | Seed lock + LoRA + Character Lock injection |
| **State Machine** | None | 12-stage pipeline + resume from failure |
| **AI Director System** | None | Rhythm analysis + emotion curve + viral scoring + 5 director rules |
| **Prompt Optimization** | Manual prompts | AI auto-optimize (simple description → cinematic prompt) |
| **Model Router** | Manual selection | 15 models smart selection + health monitoring + 4D scoring |
| **Security** | Hardcoded password | bcrypt hash + helmet + rate limiting + JWT 256bit + CORS |
| **Mobile** | None | React Native PWA (`/m/`) mobile creation + export |
| **Sora Integration** | None | Sora web reverse proxy provider |
| **API Count** | 82 | 187+ |

---

# 🎬 AI Director System (V2 Core)

The core differentiator — from "generation tool" to "AI director system" that **controls** content quality and retention.

### AI Director Agent

```
Input: Script text
  ↓ analyzeScript
Rhythm curve (0-100) + Emotion beats + Climax points + Cut suggestions
  ↓ generateShotPlan
Complete shot plan: camera/movement/lens(24-135mm)/DOF/composition/transition/prompt
  ↓ applyRhythmRules
5 professional director rules auto-correction
  ↓ scoreViralPotential
Viral potential score (0-100): hook + pacing + emotion peaks + ending
```

**5 Director Rules (auto-enforced):**
1. **First 3s Must Hook** — Dynamic camera + high intensity + close-up
2. **Pre-Climax Acceleration** — Shorter shots, faster cuts
3. **Emotion Scene Deceleration** — Longer shots + shallow DOF + close-ups
4. **Visual Change Every 3-5s** — Prevent viewer drop-off
5. **Memorable Ending** — Slow motion + fade out + music crescendo

**4 Genre Presets:** Korean Drama / Hong Kong Style / Xianxia / Cyberpunk

### Prompt Optimizer

```
Input:  "girl turns head"
Output: "beautiful young woman turning her head, cinematic close-up,
         50mm lens, shallow depth of field f/1.8, warm amber side lighting,
         korean drama aesthetic, emotional expression, masterpiece"
```

### Intelligent Model Router

- 15 models registered (Gemini/SD/ModelScope/Kling/Wan/Sora/OpenAI/DeepSeek...)
- Quality/Speed/Cost/Specialty 4D scoring
- Real-time health monitoring (latency/error rate/status)

---

# 🌟 Core Features

- ✅ **Character Generation** — Auto-analyze novel text, extract character profiles
- ✅ **Script Generation** — Structured screenplay from selected chapters
- ✅ **Storyboard Creation** — Shot-by-shot breakdown with cinematic prompts
- ✅ **Video Synthesis** — AI image + video generation with multi-model support
- ✅ **One-Sentence Creation** — Input an idea, get a complete project
- ✅ **Mobile App** — React Native PWA at `/m/`

---

# 📱 Mobile Version

Access via phone browser: `http://your-server:60000/m/`

- One-sentence creation → browse scripts → export convergence prompts
- Dark theme, touch-optimized
- Login / Project list / Script viewer / Asset browser
- Export complete prompts with CHARACTER LOCK + anti-drift rules

---

# 🔒 Security (Industrial-Grade)

- **bcrypt password hashing** — All passwords bcrypt-stored, legacy plaintext auto-migrated
- **helmet.js security headers** — XSS/Clickjacking/MIME sniffing protection
- Random initial password, force-change on first login
- Login rate limiting (5 attempts / 15 min / IP)
- JWT 256-bit key + 7-day expiry (optional 30-day remember me)
- CORS configurable via `CORS_ORIGINS` env var (production: real blocking)
- Sensitive operations (clear database) admin-only
- Token only via Header, no URL query parameter (prevents leakage)
- Content review fail-close mode (production default)
- User API never returns password fields

---

# 🚀 Installation

## Prerequisites

- Node.js 22+
- Redis (for BullMQ queue)
- LLM API Key (Qwen / DeepSeek / Gemini — any one)
- Image model (Gemini / SD Local / ModelScope — any one)
- Video model (Kling / Wan2.5 — optional)
- ffmpeg (video composition — optional)

## Quick Start

```bash
git clone https://github.com/yeluoge26/toonflow.git
cd toonflow
yarn install

# Start Redis (Docker)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Development
yarn dev

# Production build + start
yarn build
NODE_ENV=prod node build/app.js
```

## Access Points

| URL | Description |
|-----|-------------|
| `http://localhost:60000/` | Portal entry page |
| `http://localhost:60000/index.html` | Vue SPA creator workspace |
| `http://localhost:60000/admin.html` | Admin console (12 modules) |
| `http://localhost:60000/timeline.html` | Timeline director editor |
| `http://localhost:60000/m/` | Mobile PWA |

## Remote Deployment

```bash
# Via deploy script (requires paramiko)
pip install paramiko
python scripts/deploy-remote.py
```

## Docker

```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

---

# 📊 API Overview (187+ endpoints)

| Group | Endpoints | Description |
|-------|-----------|-------------|
| Project | 12 | CRUD, clone, auto-save, pipeline state, anti-drift |
| Novel | 4 | Upload, edit, delete chapters |
| Outline | 11 | AI agent storyline/outline generation (WebSocket) |
| Script | 7 | Generation, versioning, rewrite |
| Storyboard | 14 | DSL parsing, shot generation, review, batch |
| Assets | 10 | Character/scene/prop management + AI generation |
| Video | 17 | Multi-model generation, config, timeline |
| Audio | 7 | TTS, emotion voice, batch dialogue |
| Director | 4 | Script analysis, shot plan, viral scoring, prompt optimize |
| Setting | 10 | Model config, AI model mapping |
| Batch | 8 | Template-driven batch production |
| Cost | 4 | Usage tracking, budget, project cost |
| Character | 9 | Identity, consistency, voice binding, reference sheets |
| System | 4 | Stats, cache, model health |
| Other | 60+ | Queue, factory, evolution, template, distribution, etc. |

---

# 📄 License

[AGPL-3.0](../LICENSE) — Same as the original project.

---

# 🙏 Credits

- **[HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app)** — Original project
- **Vercel AI SDK** — Multi-model AI integration
- **BullMQ** — Distributed task queue
- **Express.js** — Web framework
- **Knex.js** — SQL query builder
- **sharp** — Image processing
- **ffmpeg** — Video composition
