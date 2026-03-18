import { Request, Response, NextFunction } from "express";
import u from "@/utils";

export interface ReviewResult {
  passed: boolean;
  reason?: string;
  category?: string;  // 'violence' | 'sexual' | 'political' | 'other'
}

// Content review configuration
interface ReviewConfig {
  enabled: boolean;
  provider: string;     // 'volcengine' | 'aliyun' | 'local'
  apiKey?: string;
  baseUrl?: string;
}

async function getReviewConfig(): Promise<ReviewConfig> {
  // For now, return disabled by default
  // Can be configured via settings
  return { enabled: false, provider: "local" };
}

// Review text content (prompts, scripts)
export async function reviewText(text: string): Promise<ReviewResult> {
  const config = await getReviewConfig();
  if (!config.enabled) return { passed: true };

  switch (config.provider) {
    case "volcengine":
      return await volcengineTextReview(config, text);
    case "aliyun":
      return await aliyunTextReview(config, text);
    case "local":
      return localTextReview(text);
    default:
      return { passed: true };
  }
}

// Review image content
export async function reviewImage(imageBase64: string): Promise<ReviewResult> {
  const config = await getReviewConfig();
  if (!config.enabled) return { passed: true };

  switch (config.provider) {
    case "volcengine":
      return await volcengineImageReview(config, imageBase64);
    case "aliyun":
      return await aliyunImageReview(config, imageBase64);
    default:
      return { passed: true };
  }
}

// Local keyword-based review (basic)
function localTextReview(text: string): ReviewResult {
  // Basic keyword filter - extend as needed
  const sensitivePatterns = [
    /暴力/,
    /血腥/,
    /恐怖主义/,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(text)) {
      return { passed: false, reason: "内容包含敏感词", category: "other" };
    }
  }
  return { passed: true };
}

// Stub: Volcengine text review
async function volcengineTextReview(config: ReviewConfig, text: string): Promise<ReviewResult> {
  // TODO: Implement Volcengine content moderation API
  return { passed: true };
}

// Stub: Aliyun text review
async function aliyunTextReview(config: ReviewConfig, text: string): Promise<ReviewResult> {
  // TODO: Implement Aliyun content moderation API
  return { passed: true };
}

// Stub: Volcengine image review
async function volcengineImageReview(config: ReviewConfig, imageBase64: string): Promise<ReviewResult> {
  // TODO: Implement Volcengine image moderation API
  return { passed: true };
}

// Stub: Aliyun image review
async function aliyunImageReview(config: ReviewConfig, imageBase64: string): Promise<ReviewResult> {
  // TODO: Implement Aliyun image moderation API
  return { passed: true };
}

// Express middleware for reviewing request body text fields
export function reviewMiddleware(textFields: string[] = ["prompt", "content", "text"]) {
  return async (req: Request, res: Response, next: NextFunction) => {
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
      // If review system fails, allow through (fail-open)
      next();
    }
  };
}
