# Data Layer Strategy

## Decision: Knex is the Primary Data Layer

ToonFlow uses **Knex** (with SQLite via `better-sqlite3`) as its primary data layer. Prisma exists in the codebase but is **deprecated** and should not be used for new features.

### Why Knex over Prisma?

- All business-critical routes (`src/routes/`) use Knex with `t_*` tables
- Schema migrations are handled via `fixDB.ts`, which is simpler for SQLite
- Type definitions are auto-generated into `src/types/database.d.ts`
- Prisma is only used in the NestJS worker subsystem (`src/nest/`), which mirrors the same tables

### Prisma Status

- `prisma/schema.prisma` is kept for **reference only** -- it is not the source of truth
- `@prisma/client` is used in a few NestJS services (`src/nest/modules/batch/`, `src/nest/modules/score/`, `src/nest/modules/prompt/`, `src/nest/workers/`)
- Long-term plan: migrate these NestJS services to use the shared Knex instance

---

## Tables and Their Purposes

All tables use the `t_` prefix and are defined in `src/lib/initDB.ts` (initial creation) and `src/lib/fixDB.ts` (schema migrations).

### Core Business Tables

| Table | Purpose |
|-------|---------|
| `t_user` | User accounts (admin login) |
| `t_project` | Projects (short drama / comic productions) |
| `t_script` | Scripts belonging to projects |
| `t_outline` | Episode outlines with versioning |
| `t_novel` | Source novel chapters for adaptation |
| `t_storyline` | Storyline groupings linking novels |
| `t_assets` | Generated assets (images, videos, audio) per shot |
| `t_chatHistory` | AI conversation history per project |

### Configuration Tables

| Table | Purpose |
|-------|---------|
| `t_setting` | User settings (API keys, model preferences) |
| `t_config` | AI model configurations (API keys, base URLs) |
| `t_aiModelMap` | Mapping of model keys to configs (with fallback support) |
| `t_textModel` | Available text/LLM models and capabilities |
| `t_imageModel` | Available image generation models |
| `t_videoModel` | Available video generation models |
| `t_artStyle` | Art style presets |
| `t_prompts` | Prompt templates |

### Media Generation Tables

| Table | Purpose |
|-------|---------|
| `t_image` | Generated images linked to assets |
| `t_video` | Generated videos with model/prompt metadata |
| `t_videoConfig` | Video generation configurations per project |
| `t_video_gen` | Video generation task tracking (taskId, status, URL) |
| `t_video_constraints` | Video generation constraints and rules |

### Production Pipeline Tables

| Table | Purpose |
|-------|---------|
| `t_taskQueue` | General async task queue (type, status, priority, retries) |
| `t_batch` | Batch production runs |
| `t_pipelineTask` | Individual pipeline tasks within batches |
| `t_batch_job` | Batch job definitions |
| `t_production_template` | Production pipeline templates |

### Analytics & Scoring Tables

| Table | Purpose |
|-------|---------|
| `t_scores` | Script quality scores (hook, emotion, visual, conflict) |
| `t_metrics` | Platform performance metrics (views, likes, shares) |
| `t_modelPricing` | Model pricing data for cost estimation |
| `t_modelUsage` | Per-call model usage tracking (tokens, cost, duration) |

### AI Optimization Tables

| Table | Purpose |
|-------|---------|
| `t_promptGenome` | Prompt evolution system (genetic algorithm for prompts) |
| `t_promptMetrics` | Performance metrics per prompt variant |
| `t_promptEvolution` | Parent-child relationships for prompt mutations |
| `t_variablePool` | Variable values for prompt templates |
| `t_templateRules` | Structural rules for content templates |
| `t_template` | Content templates (category, structure, success rate) |

### Character & Content Tables

| Table | Purpose |
|-------|---------|
| `t_character` | Character definitions (name, appearance, voice, LoRA) |
| `t_character_identity` | Detailed character identity (face, body, clothing, color palette) |
| `t_voice_profile` | Voice profiles for TTS |
| `t_anti_drift_config` | Anti-drift engine configuration |
| `t_viral_template` | Viral content structure templates |
| `t_series` | Series (multi-episode) definitions |

---

## Migration Strategy

Schema changes are applied via `src/lib/fixDB.ts`. This file runs on every application startup and uses idempotent operations:

- **Add column**: `addColumn(table, column, type)` -- checks if column exists first
- **Drop column**: `dropColumn(table, column)` -- checks if column exists first
- **Alter column type**: `alterColumnType(table, column, type)` -- safe alter
- **Create table**: `if (!(await knex.schema.hasTable(...)))` guard before `createTable`

### How to add a new migration

1. Add idempotent migration code to `src/lib/fixDB.ts`
2. If adding a new table, also add the table definition to `src/lib/initDB.ts`
3. Regenerate types: the `src/types/database.d.ts` file is auto-generated from the live schema using `@rmp135/sql-ts`

---

## Type Definitions

TypeScript interfaces for all tables are auto-generated in:

```
src/types/database.d.ts
```

Each interface is named after its table (e.g., `t_project`, `t_script`, `t_assets`). These interfaces are used throughout the codebase for type-safe Knex queries.

---

## Usage Pattern

```typescript
import knex from '@/lib/db';  // shared Knex instance

// Query example
const projects = await knex('t_project').where({ userId: 1 });

// Insert example
await knex('t_script').insert({ projectId: 1, content: '...', version: 1 });

// Update example
await knex('t_assets').where({ id: assetId }).update({ state: 'completed' });
```
