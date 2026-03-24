import { Request, Response, NextFunction } from "express";
import u from "@/utils";
import { db } from "@/utils/db";

export interface ReviewResult {
  passed: boolean;
  reason?: string;
  category?: string;  // 'violence' | 'sexual' | 'political' | 'other'
}

// Content review configuration
interface ReviewConfig {
  enabled: boolean;
  mode: 'fail-open' | 'fail-close';
  provider: string;     // 'volcengine' | 'aliyun' | 'local'
  blocklist: string[];  // configurable keyword blocklist
  apiKey?: string;
  baseUrl?: string;
}

// Cache review config to avoid repeated DB reads
let cachedConfig: ReviewConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60_000; // 1 minute

/**
 * Read review config from t_setting (contentReviewEnabled, contentReviewMode, contentBlocklist).
 * Defaults differ by environment:
 *   - dev:  disabled
 *   - prod: enabled + fail-close
 */
export async function getReviewConfig(): Promise<ReviewConfig> {
  const now = Date.now();
  if (cachedConfig && (now - configCacheTime) < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const isProd = process.env.NODE_ENV !== "dev";

  // Read from t_setting row id=1 – columns may not exist yet
  let settingRow: any = null;
  try {
    settingRow = await db("t_setting").where("id", 1).first();
  } catch {
    // table or columns missing – use defaults
  }

  let enabled: boolean;
  let mode: 'fail-open' | 'fail-close';
  let blocklist: string[] = [];

  if (settingRow?.contentReviewEnabled !== undefined && settingRow?.contentReviewEnabled !== null) {
    enabled = !!settingRow.contentReviewEnabled;
  } else {
    // Default: disabled in dev, enabled in prod
    enabled = isProd;
  }

  if (settingRow?.contentReviewMode) {
    mode = settingRow.contentReviewMode === 'fail-close' ? 'fail-close' : 'fail-open';
  } else {
    // Default: fail-open in dev, fail-close in prod
    mode = isProd ? 'fail-close' : 'fail-open';
  }

  // Parse blocklist from JSON array stored in t_setting
  if (settingRow?.contentBlocklist) {
    try {
      const parsed = JSON.parse(settingRow.contentBlocklist);
      if (Array.isArray(parsed)) {
        blocklist = parsed.filter((item: any) => typeof item === 'string' && item.length > 0);
      }
    } catch {
      blocklist = [];
    }
  }

  cachedConfig = {
    enabled,
    mode,
    provider: "local",
    blocklist,
  };
  configCacheTime = now;

  return cachedConfig;
}

/** Invalidate cached config (call after settings update) */
export function invalidateReviewConfigCache() {
  cachedConfig = null;
  configCacheTime = 0;
}

/**
 * Unified content review entry point.
 * @param content - text or base64 image data
 * @param type - 'text' | 'image'
 */
export async function reviewContent(content: string, type: 'text' | 'image'): Promise<{ passed: boolean; reason?: string }> {
  if (type === 'text') {
    return reviewText(content);
  }
  return reviewImage(content);
}

// Review text content (prompts, scripts)
export async function reviewText(text: string): Promise<ReviewResult> {
  const config = await getReviewConfig();
  if (!config.enabled) return { passed: true };

  try {
    switch (config.provider) {
      case "volcengine":
        return await volcengineTextReview(config, text);
      case "aliyun":
        return await aliyunTextReview(config, text);
      case "local":
        return localTextReview(config, text);
      default:
        return localTextReview(config, text);
    }
  } catch (err) {
    // Fail-close: block on error; Fail-open: allow on error
    if (config.mode === 'fail-close') {
      return { passed: false, reason: "内容审核服务不可用，已拦截 (fail-close)" };
    }
    return { passed: true };
  }
}

// Review image content
export async function reviewImage(imageBase64: string): Promise<ReviewResult> {
  const config = await getReviewConfig();
  if (!config.enabled) return { passed: true };

  try {
    switch (config.provider) {
      case "volcengine":
        return await volcengineImageReview(config, imageBase64);
      case "aliyun":
        return await aliyunImageReview(config, imageBase64);
      default:
        // No local image review capability – respect mode
        if (config.mode === 'fail-close') {
          return { passed: false, reason: "图片审核服务不可用，已拦截 (fail-close)" };
        }
        return { passed: true };
    }
  } catch (err) {
    if (config.mode === 'fail-close') {
      return { passed: false, reason: "图片审核服务不可用，已拦截 (fail-close)" };
    }
    return { passed: true };
  }
}

// Local keyword-based review with configurable blocklist
function localTextReview(config: ReviewConfig, text: string): ReviewResult {
  // Built-in sensitive patterns (always active)
  const builtinPatterns = [
    /暴力/,
    /血腥/,
    /恐怖主义/,
  ];

  for (const pattern of builtinPatterns) {
    if (pattern.test(text)) {
      return { passed: false, reason: "内容包含敏感词", category: "other" };
    }
  }

  // Configurable blocklist from t_setting.contentBlocklist
  if (config.blocklist.length > 0) {
    const lowerText = text.toLowerCase();
    for (const keyword of config.blocklist) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return {
          passed: false,
          reason: `内容包含屏蔽词: ${keyword}`,
          category: "other",
        };
      }
    }
  }

  return { passed: true };
}

// Stub: Volcengine text review
async function volcengineTextReview(config: ReviewConfig, text: string): Promise<ReviewResult> {
  // TODO: Implement Volcengine content moderation API
  // In fail-close mode, unimplemented providers should block
  if (config.mode === 'fail-close') {
    return { passed: false, reason: "Volcengine审核接口未实现，已拦截 (fail-close)" };
  }
  return { passed: true };
}

// Stub: Aliyun text review
async function aliyunTextReview(config: ReviewConfig, text: string): Promise<ReviewResult> {
  // TODO: Implement Aliyun content moderation API
  if (config.mode === 'fail-close') {
    return { passed: false, reason: "Aliyun审核接口未实现，已拦截 (fail-close)" };
  }
  return { passed: true };
}

// Stub: Volcengine image review
async function volcengineImageReview(config: ReviewConfig, imageBase64: string): Promise<ReviewResult> {
  // TODO: Implement Volcengine image moderation API
  if (config.mode === 'fail-close') {
    return { passed: false, reason: "Volcengine图片审核接口未实现，已拦截 (fail-close)" };
  }
  return { passed: true };
}

// Stub: Aliyun image review
async function aliyunImageReview(config: ReviewConfig, imageBase64: string): Promise<ReviewResult> {
  // TODO: Implement Aliyun image moderation API
  if (config.mode === 'fail-close') {
    return { passed: false, reason: "Aliyun图片审核接口未实现，已拦截 (fail-close)" };
  }
  return { passed: true };
}

// Express middleware for reviewing request body text fields
export function reviewMiddleware(textFields: string[] = ["prompt", "content", "text"]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const config = await getReviewConfig();
    try {
      for (const field of textFields) {
        if (req.body[field] && typeof req.body[field] === "string") {
          const result = await reviewText(req.body[field]);
          if (!result.passed) {
            return res.status(403).send({
              code: 403,
              message: `内容审核未通过: ${result.reason}`,
              category: result.category,
            });
          }
        }
      }
      next();
    } catch (err) {
      // Respect fail-close mode even in middleware
      if (config.mode === 'fail-close') {
        return res.status(503).send({
          code: 503,
          message: "内容审核服务异常，请求已拦截 (fail-close)",
        });
      }
      // fail-open: allow through
      next();
    }
  };
}
