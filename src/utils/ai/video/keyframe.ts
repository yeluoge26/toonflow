// Keyframe-based video generation pipeline
// Flow: Storyboard shots → Extract keyframes → Interpolate → Generate video

import u from "@/utils";

export interface Keyframe {
  timestamp: number;        // seconds from start
  imageUrl: string;         // keyframe image path
  prompt: string;           // motion description for this segment
  duration: number;         // duration to next keyframe
  transition: "cut" | "dissolve" | "fade" | "wipe";
}

export interface VideoTimeline {
  projectId: number;
  scriptId: number;
  totalDuration: number;
  keyframes: Keyframe[];
  audioTrack?: string;      // path to audio file
  bgmTrack?: string;        // path to background music
}

// Build a timeline from storyboard shots
export function buildTimelineFromShots(
  shots: Array<{
    imageUrl?: string;
    videoPrompt?: string;
    duration?: number;
    cells?: Array<{ src?: string }>;
  }>
): Keyframe[] {
  let currentTime = 0;
  const keyframes: Keyframe[] = [];

  for (const shot of shots) {
    const imageUrl = shot.imageUrl || shot.cells?.[0]?.src || "";
    const duration = shot.duration || 3;

    keyframes.push({
      timestamp: currentTime,
      imageUrl,
      prompt: shot.videoPrompt || "",
      duration,
      transition: "cut",
    });

    currentTime += duration;
  }

  return keyframes;
}

// Calculate optimal transition between keyframes
export function suggestTransitions(keyframes: Keyframe[]): Keyframe[] {
  return keyframes.map((kf, i) => {
    if (i === 0) return { ...kf, transition: "fade" as const };  // First: fade in
    if (i === keyframes.length - 1) return { ...kf, transition: "fade" as const };  // Last: fade out

    // If there's a big time gap or scene change, use dissolve
    const prevDuration = keyframes[i - 1].duration;
    if (prevDuration > 5) return { ...kf, transition: "dissolve" as const };

    return { ...kf, transition: "cut" as const };
  });
}

// Estimate total video duration from timeline
export function calculateTotalDuration(keyframes: Keyframe[]): number {
  return keyframes.reduce((sum, kf) => sum + kf.duration, 0);
}
