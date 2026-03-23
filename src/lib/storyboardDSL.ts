/**
 * Storyboard DSL Engine
 * Structured Domain Specific Language for storyboard shots
 * that goes beyond simple text prompts.
 */

// ============================================================
// Types
// ============================================================

export type CameraType = "close_up" | "medium_shot" | "wide_shot" | "extreme_wide" | "extreme_close_up" | "over_shoulder" | "pov";
export type CameraAngle = "eye_level" | "high_angle" | "low_angle" | "dutch_angle" | "bird_eye" | "worm_eye";
export type CameraMovement = "static" | "push_in" | "pull_out" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "dolly" | "orbit" | "crane" | "handheld";
export type CameraComposition = "rule_of_thirds" | "center" | "diagonal" | "frame_within_frame" | "leading_lines";
export type Emotion = "tense" | "sad" | "happy" | "angry" | "peaceful" | "mysterious" | "romantic" | "terrifying" | "epic";
export type Transition = "cut" | "dissolve" | "fade_in" | "fade_out" | "wipe";
export type TimeOfDay = "day" | "night" | "dawn" | "dusk";
export type CharacterPosition = "foreground" | "midground" | "background" | "left" | "right" | "center";

export interface StoryboardDSL {
  projectId: number;
  episode: number;
  scene: number;

  globalStyle: {
    artStyle: string;
    genre: string;
    colorGrading: string;
    camera: string;
  };

  location: {
    id: string;
    name: string;
    description: string;
    lockPrompt: string;
  };

  transition: Transition;

  shots: StoryboardShot[];
}

export interface StoryboardShot {
  index: number;
  durationMs: number;
  timeOfDay: TimeOfDay;

  camera: {
    type: CameraType;
    angle: CameraAngle;
    movement: CameraMovement;
    composition: CameraComposition;
  };

  emotion: Emotion;

  characters: Array<{
    id: string;
    name: string;
    action: string;
    expression: string;
    position: CharacterPosition;
  }>;

  dialogue?: {
    speaker: string;
    text: string;
    voiceStyle: string;
  };

  sound: {
    ambient: string;
    sfx?: string;
    music?: string;
  };

  imagePrompt: string;
  videoPrompt: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================
// Constants
// ============================================================

const VALID_CAMERA_TYPES: CameraType[] = ["close_up", "medium_shot", "wide_shot", "extreme_wide", "extreme_close_up", "over_shoulder", "pov"];
const VALID_CAMERA_ANGLES: CameraAngle[] = ["eye_level", "high_angle", "low_angle", "dutch_angle", "bird_eye", "worm_eye"];
const VALID_CAMERA_MOVEMENTS: CameraMovement[] = ["static", "push_in", "pull_out", "pan_left", "pan_right", "tilt_up", "tilt_down", "dolly", "orbit", "crane", "handheld"];
const VALID_COMPOSITIONS: CameraComposition[] = ["rule_of_thirds", "center", "diagonal", "frame_within_frame", "leading_lines"];
const VALID_EMOTIONS: Emotion[] = ["tense", "sad", "happy", "angry", "peaceful", "mysterious", "romantic", "terrifying", "epic"];
const VALID_TRANSITIONS: Transition[] = ["cut", "dissolve", "fade_in", "fade_out", "wipe"];
const VALID_TIMES: TimeOfDay[] = ["day", "night", "dawn", "dusk"];
const VALID_POSITIONS: CharacterPosition[] = ["foreground", "midground", "background", "left", "right", "center"];

// Camera type to English description mapping
const CAMERA_TYPE_MAP: Record<CameraType, string> = {
  close_up: "close-up shot",
  medium_shot: "medium shot",
  wide_shot: "wide shot",
  extreme_wide: "extreme wide shot",
  extreme_close_up: "extreme close-up",
  over_shoulder: "over-the-shoulder shot",
  pov: "POV first-person shot",
};

const CAMERA_ANGLE_MAP: Record<CameraAngle, string> = {
  eye_level: "eye level angle",
  high_angle: "high angle looking down",
  low_angle: "low angle looking up",
  dutch_angle: "dutch angle tilted",
  bird_eye: "bird's eye view from above",
  worm_eye: "worm's eye view from below",
};

const CAMERA_MOVEMENT_MAP: Record<CameraMovement, string> = {
  static: "static camera",
  push_in: "camera pushing in slowly",
  pull_out: "camera pulling out",
  pan_left: "camera panning left",
  pan_right: "camera panning right",
  tilt_up: "camera tilting up",
  tilt_down: "camera tilting down",
  dolly: "dolly tracking shot",
  orbit: "orbiting camera movement",
  crane: "crane shot rising",
  handheld: "handheld camera movement",
};

const COMPOSITION_MAP: Record<CameraComposition, string> = {
  rule_of_thirds: "rule of thirds composition",
  center: "center composition",
  diagonal: "diagonal composition",
  frame_within_frame: "frame within frame composition",
  leading_lines: "leading lines composition",
};

const EMOTION_MAP: Record<Emotion, string> = {
  tense: "tense and suspenseful atmosphere",
  sad: "melancholic and sorrowful mood",
  happy: "joyful and uplifting mood",
  angry: "intense and angry atmosphere",
  peaceful: "serene and peaceful atmosphere",
  mysterious: "mysterious and enigmatic mood",
  romantic: "romantic and tender atmosphere",
  terrifying: "dark and terrifying atmosphere",
  epic: "epic and grand cinematic atmosphere",
};

// ============================================================
// 1. parseDSLFromText
// ============================================================

/**
 * Parse a tagged storyboard text format into DSL.
 * Format:
 * [PROJECT] id=1 episode=1 scene=1
 * [STYLE] artStyle=龙族传说 genre=仙侠 colorGrading=warm amber camera=50mm cinematic
 * [LOCATION] id=L1 name=天宫陵水殿 description=金碧辉煌的仙宫大殿 lockPrompt=golden palace hall
 * [TRANSITION] dissolve
 * [SHOT] index=1 duration=3000 timeOfDay=day
 *   [CAMERA] type=close_up angle=eye_level movement=push_in composition=rule_of_thirds
 *   [EMOTION] tense
 *   [CHARACTER] id=R1 name=洛轻云 action=蜷缩在角落 expression=隐忍痛苦 position=center
 *   [DIALOGUE] speaker=洛轻云 text=我不需要你的施舍。 voiceStyle=女声，青年音色，带压抑颤音
 *   [SOUND] ambient=丝竹余韵 sfx=酒杯碰撞声 music=低沉大提琴
 * [/SHOT]
 */
export function parseDSLFromText(text: string): StoryboardDSL {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const dsl: StoryboardDSL = {
    projectId: 0,
    episode: 1,
    scene: 1,
    globalStyle: { artStyle: "", genre: "", colorGrading: "", camera: "" },
    location: { id: "", name: "", description: "", lockPrompt: "" },
    transition: "cut",
    shots: [],
  };

  let currentShot: Partial<StoryboardShot> | null = null;

  for (const line of lines) {
    // [PROJECT]
    if (line.startsWith("[PROJECT]")) {
      const attrs = parseAttributes(line.replace("[PROJECT]", ""));
      dsl.projectId = parseInt(attrs.id || "0", 10);
      dsl.episode = parseInt(attrs.episode || "1", 10);
      dsl.scene = parseInt(attrs.scene || "1", 10);
      continue;
    }

    // [STYLE]
    if (line.startsWith("[STYLE]")) {
      const attrs = parseAttributes(line.replace("[STYLE]", ""));
      dsl.globalStyle.artStyle = attrs.artstyle || attrs.artStyle || "";
      dsl.globalStyle.genre = attrs.genre || "";
      dsl.globalStyle.colorGrading = attrs.colorgrading || attrs.colorGrading || "";
      dsl.globalStyle.camera = attrs.camera || "";
      continue;
    }

    // [LOCATION]
    if (line.startsWith("[LOCATION]")) {
      const attrs = parseAttributes(line.replace("[LOCATION]", ""));
      dsl.location.id = attrs.id || "";
      dsl.location.name = attrs.name || "";
      dsl.location.description = attrs.description || "";
      dsl.location.lockPrompt = attrs.lockprompt || attrs.lockPrompt || "";
      continue;
    }

    // [TRANSITION]
    if (line.startsWith("[TRANSITION]")) {
      const val = line.replace("[TRANSITION]", "").trim().toLowerCase() as Transition;
      if (VALID_TRANSITIONS.includes(val)) {
        dsl.transition = val;
      }
      continue;
    }

    // [SHOT]
    if (line.startsWith("[SHOT]") && !line.startsWith("[/SHOT]")) {
      const attrs = parseAttributes(line.replace("[SHOT]", ""));
      currentShot = {
        index: parseInt(attrs.index || "0", 10),
        durationMs: parseInt(attrs.duration || attrs.durationms || attrs.durationMs || "3000", 10),
        timeOfDay: (attrs.timeofday || attrs.timeOfDay || "day") as TimeOfDay,
        characters: [],
        sound: { ambient: "" },
        imagePrompt: "",
        videoPrompt: "",
      };
      continue;
    }

    // [/SHOT]
    if (line.startsWith("[/SHOT]")) {
      if (currentShot) {
        dsl.shots.push(currentShot as StoryboardShot);
        currentShot = null;
      }
      continue;
    }

    // Inside a shot block
    if (currentShot) {
      // [CAMERA]
      if (line.startsWith("[CAMERA]")) {
        const attrs = parseAttributes(line.replace("[CAMERA]", ""));
        currentShot.camera = {
          type: (attrs.type || "medium_shot") as CameraType,
          angle: (attrs.angle || "eye_level") as CameraAngle,
          movement: (attrs.movement || "static") as CameraMovement,
          composition: (attrs.composition || "rule_of_thirds") as CameraComposition,
        };
        continue;
      }

      // [EMOTION]
      if (line.startsWith("[EMOTION]")) {
        currentShot.emotion = line.replace("[EMOTION]", "").trim().toLowerCase() as Emotion;
        continue;
      }

      // [CHARACTER]
      if (line.startsWith("[CHARACTER]")) {
        const attrs = parseAttributes(line.replace("[CHARACTER]", ""));
        if (!currentShot.characters) currentShot.characters = [];
        currentShot.characters.push({
          id: attrs.id || "",
          name: attrs.name || "",
          action: attrs.action || "",
          expression: attrs.expression || "",
          position: (attrs.position || "center") as CharacterPosition,
        });
        continue;
      }

      // [DIALOGUE]
      if (line.startsWith("[DIALOGUE]")) {
        const attrs = parseAttributes(line.replace("[DIALOGUE]", ""));
        currentShot.dialogue = {
          speaker: attrs.speaker || "",
          text: attrs.text || "",
          voiceStyle: attrs.voicestyle || attrs.voiceStyle || "",
        };
        continue;
      }

      // [SOUND]
      if (line.startsWith("[SOUND]")) {
        const attrs = parseAttributes(line.replace("[SOUND]", ""));
        currentShot.sound = {
          ambient: attrs.ambient || "",
          sfx: attrs.sfx || undefined,
          music: attrs.music || undefined,
        };
        continue;
      }
    }
  }

  // If there's an unclosed shot, push it
  if (currentShot) {
    dsl.shots.push(currentShot as StoryboardShot);
  }

  // Auto-build prompts for each shot
  for (const shot of dsl.shots) {
    if (!shot.camera) {
      shot.camera = { type: "medium_shot", angle: "eye_level", movement: "static", composition: "rule_of_thirds" };
    }
    if (!shot.emotion) {
      shot.emotion = "peaceful";
    }
    shot.imagePrompt = buildImagePromptFromDSL(shot, dsl);
    shot.videoPrompt = buildVideoPromptFromDSL(shot, dsl);
  }

  return dsl;
}

/**
 * Parse key=value attributes from a string.
 * Supports quoted values: key="value with spaces"
 */
function parseAttributes(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Match key=value or key="value with spaces"
  const regex = /(\w+)\s*=\s*(?:"([^"]*?)"|(\S+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(str)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] !== undefined ? match[2] : match[3];
    // Also keep original case version
    result[key] = value;
    result[match[1]] = value;
  }
  return result;
}

// ============================================================
// 2. buildImagePromptFromDSL
// ============================================================

export function buildImagePromptFromDSL(shot: StoryboardShot, dsl: StoryboardDSL): string {
  const parts: string[] = [];

  // Camera framing
  if (shot.camera) {
    parts.push(CAMERA_TYPE_MAP[shot.camera.type] || shot.camera.type);
    parts.push(CAMERA_ANGLE_MAP[shot.camera.angle] || shot.camera.angle);
    parts.push(COMPOSITION_MAP[shot.camera.composition] || shot.camera.composition);
  }

  // Characters
  if (shot.characters && shot.characters.length > 0) {
    for (const char of shot.characters) {
      const charParts = [char.name];
      if (char.action) charParts.push(char.action);
      if (char.expression) charParts.push(char.expression);
      if (char.position) charParts.push(`positioned ${char.position}`);
      parts.push(charParts.join(", "));
    }
  }

  // Location
  if (dsl.location && dsl.location.name) {
    parts.push(`scene: ${dsl.location.name}`);
    if (dsl.location.lockPrompt) {
      parts.push(dsl.location.lockPrompt);
    }
  }

  // Time of day
  if (shot.timeOfDay) {
    parts.push(`${shot.timeOfDay} lighting`);
  }

  // Emotion/atmosphere
  if (shot.emotion) {
    parts.push(EMOTION_MAP[shot.emotion] || shot.emotion);
  }

  // Global style
  if (dsl.globalStyle) {
    if (dsl.globalStyle.artStyle) parts.push(`${dsl.globalStyle.artStyle} style`);
    if (dsl.globalStyle.genre) parts.push(dsl.globalStyle.genre);
    if (dsl.globalStyle.colorGrading) parts.push(`${dsl.globalStyle.colorGrading} color grading`);
    if (dsl.globalStyle.camera) parts.push(dsl.globalStyle.camera);
  }

  // Quality suffix
  parts.push("8k, ultra HD, high detail, no subtitles, no text overlays");

  return parts.join(", ");
}

// ============================================================
// 3. buildVideoPromptFromDSL
// ============================================================

export function buildVideoPromptFromDSL(shot: StoryboardShot, dsl: StoryboardDSL): string {
  const parts: string[] = [];

  // Camera movement is critical for video
  if (shot.camera) {
    parts.push(CAMERA_TYPE_MAP[shot.camera.type] || shot.camera.type);
    parts.push(CAMERA_ANGLE_MAP[shot.camera.angle] || shot.camera.angle);
    parts.push(CAMERA_MOVEMENT_MAP[shot.camera.movement] || shot.camera.movement);
  }

  // Characters with actions (focus on motion for video)
  if (shot.characters && shot.characters.length > 0) {
    for (const char of shot.characters) {
      const charParts = [char.name];
      if (char.action) charParts.push(char.action);
      if (char.expression) charParts.push(`expression: ${char.expression}`);
      parts.push(charParts.join(", "));
    }
  }

  // Location
  if (dsl.location && dsl.location.name) {
    parts.push(`in ${dsl.location.name}`);
    if (dsl.location.lockPrompt) {
      parts.push(dsl.location.lockPrompt);
    }
  }

  // Time and atmosphere
  if (shot.timeOfDay) {
    parts.push(`${shot.timeOfDay} time`);
  }
  if (shot.emotion) {
    parts.push(EMOTION_MAP[shot.emotion] || shot.emotion);
  }

  // Style lock
  if (dsl.globalStyle) {
    if (dsl.globalStyle.artStyle) parts.push(`${dsl.globalStyle.artStyle} style`);
    if (dsl.globalStyle.colorGrading) parts.push(`${dsl.globalStyle.colorGrading} color grading`);
  }

  // Duration hint
  if (shot.durationMs) {
    parts.push(`${(shot.durationMs / 1000).toFixed(1)}s duration`);
  }

  // Quality suffix
  parts.push("cinematic quality, smooth motion, no subtitles, no text overlays, no random characters");

  return parts.join(", ");
}

// ============================================================
// 4. validateDSL
// ============================================================

export function validateDSL(dsl: StoryboardDSL): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Project validation
  if (!dsl.projectId || dsl.projectId <= 0) {
    errors.push("projectId is required and must be positive");
  }
  if (!dsl.episode || dsl.episode <= 0) {
    errors.push("episode is required and must be positive");
  }
  if (!dsl.scene || dsl.scene <= 0) {
    errors.push("scene is required and must be positive");
  }

  // Global style
  if (!dsl.globalStyle.artStyle) {
    warnings.push("globalStyle.artStyle is empty - shots may lack style consistency");
  }
  if (!dsl.globalStyle.genre) {
    warnings.push("globalStyle.genre is empty");
  }

  // Location
  if (!dsl.location.name) {
    warnings.push("location.name is empty - scene location undefined");
  }
  if (!dsl.location.lockPrompt) {
    warnings.push("location.lockPrompt is empty - location consistency may vary");
  }

  // Transition
  if (!VALID_TRANSITIONS.includes(dsl.transition)) {
    errors.push(`Invalid transition: "${dsl.transition}". Must be one of: ${VALID_TRANSITIONS.join(", ")}`);
  }

  // Shots
  if (!dsl.shots || dsl.shots.length === 0) {
    errors.push("At least one shot is required");
  }

  const seenIndices = new Set<number>();
  for (const shot of dsl.shots) {
    // Index uniqueness
    if (seenIndices.has(shot.index)) {
      errors.push(`Duplicate shot index: ${shot.index}`);
    }
    seenIndices.add(shot.index);

    // Duration
    if (shot.durationMs < 1000 || shot.durationMs > 30000) {
      warnings.push(`Shot ${shot.index}: durationMs ${shot.durationMs} is outside typical range (1000-30000)`);
    }

    // Time of day
    if (!VALID_TIMES.includes(shot.timeOfDay)) {
      errors.push(`Shot ${shot.index}: invalid timeOfDay "${shot.timeOfDay}"`);
    }

    // Camera validation
    if (shot.camera) {
      if (!VALID_CAMERA_TYPES.includes(shot.camera.type)) {
        errors.push(`Shot ${shot.index}: invalid camera.type "${shot.camera.type}"`);
      }
      if (!VALID_CAMERA_ANGLES.includes(shot.camera.angle)) {
        errors.push(`Shot ${shot.index}: invalid camera.angle "${shot.camera.angle}"`);
      }
      if (!VALID_CAMERA_MOVEMENTS.includes(shot.camera.movement)) {
        errors.push(`Shot ${shot.index}: invalid camera.movement "${shot.camera.movement}"`);
      }
      if (!VALID_COMPOSITIONS.includes(shot.camera.composition)) {
        errors.push(`Shot ${shot.index}: invalid camera.composition "${shot.camera.composition}"`);
      }
    } else {
      errors.push(`Shot ${shot.index}: camera configuration is required`);
    }

    // Emotion
    if (!VALID_EMOTIONS.includes(shot.emotion)) {
      errors.push(`Shot ${shot.index}: invalid emotion "${shot.emotion}"`);
    }

    // Characters
    if (shot.characters) {
      for (const char of shot.characters) {
        if (!char.name) {
          errors.push(`Shot ${shot.index}: character name is required`);
        }
        if (!VALID_POSITIONS.includes(char.position)) {
          errors.push(`Shot ${shot.index}: invalid character position "${char.position}" for ${char.name}`);
        }
      }
    }

    // Consecutive same camera type warning
    const shotIdx = dsl.shots.indexOf(shot);
    if (shotIdx > 0 && dsl.shots[shotIdx - 1].camera?.type === shot.camera?.type) {
      warnings.push(`Shots ${shot.index - 1} and ${shot.index} use the same camera type "${shot.camera?.type}" - consider varying`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================
// 5. dslToText
// ============================================================

export function dslToText(dsl: StoryboardDSL): string {
  const lines: string[] = [];

  // Project
  lines.push(`[PROJECT] id=${dsl.projectId} episode=${dsl.episode} scene=${dsl.scene}`);

  // Style
  lines.push(`[STYLE] artStyle="${dsl.globalStyle.artStyle}" genre="${dsl.globalStyle.genre}" colorGrading="${dsl.globalStyle.colorGrading}" camera="${dsl.globalStyle.camera}"`);

  // Location
  lines.push(`[LOCATION] id="${dsl.location.id}" name="${dsl.location.name}" description="${dsl.location.description}" lockPrompt="${dsl.location.lockPrompt}"`);

  // Transition
  lines.push(`[TRANSITION] ${dsl.transition}`);

  lines.push("");

  // Shots
  for (const shot of dsl.shots) {
    lines.push(`[SHOT] index=${shot.index} duration=${shot.durationMs} timeOfDay=${shot.timeOfDay}`);

    // Camera
    if (shot.camera) {
      lines.push(`  [CAMERA] type=${shot.camera.type} angle=${shot.camera.angle} movement=${shot.camera.movement} composition=${shot.camera.composition}`);
    }

    // Emotion
    if (shot.emotion) {
      lines.push(`  [EMOTION] ${shot.emotion}`);
    }

    // Characters
    if (shot.characters) {
      for (const char of shot.characters) {
        lines.push(`  [CHARACTER] id="${char.id}" name="${char.name}" action="${char.action}" expression="${char.expression}" position=${char.position}`);
      }
    }

    // Dialogue
    if (shot.dialogue) {
      lines.push(`  [DIALOGUE] speaker="${shot.dialogue.speaker}" text="${shot.dialogue.text}" voiceStyle="${shot.dialogue.voiceStyle}"`);
    }

    // Sound
    if (shot.sound) {
      let soundLine = `  [SOUND] ambient="${shot.sound.ambient}"`;
      if (shot.sound.sfx) soundLine += ` sfx="${shot.sound.sfx}"`;
      if (shot.sound.music) soundLine += ` music="${shot.sound.music}"`;
      lines.push(soundLine);
    }

    lines.push("[/SHOT]");
    lines.push("");
  }

  return lines.join("\n");
}
