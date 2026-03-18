// Structured storyboard shot definition
// Replaces free-text descriptions with parseable fields

export interface StructuredShot {
  id: number;
  segmentId: number;

  // Camera
  shotType: ShotType;
  cameraAngle: CameraAngle;
  cameraMove: CameraMove;
  composition: Composition;

  // Scene
  sceneId?: number;        // references t_assets scene
  lighting: string;
  timeOfDay: string;
  weather?: string;

  // Characters
  characters: ShotCharacter[];

  // Timing
  duration: number;        // seconds

  // Emotion & mood
  emotion: string;
  mood: string;
  colorTone: string;

  // Generated content
  promptText?: string;     // AI-generated image prompt
  imageUrl?: string;       // generated image
  videoPrompt?: string;    // motion prompt for video
  audioUrl?: string;       // TTS audio for dialogue

  // Dialogue (if any)
  dialogue?: {
    character: string;
    line: string;
    emotion: string;
  };
}

export type ShotType =
  | "extreme-wide"    // 大远景
  | "wide"            // 远景
  | "full"            // 全景
  | "medium"          // 中景
  | "close-up"        // 近景
  | "extreme-close"   // 特写
  | "detail";         // 大特写

export type CameraAngle =
  | "eye-level"       // 平视
  | "high-angle"      // 俯拍
  | "low-angle"       // 仰拍
  | "dutch-angle"     // 荷兰角
  | "overhead"        // 鸟瞰
  | "pov";            // 主观视角

export type CameraMove =
  | "static"          // 固定
  | "pan-left"        // 左摇
  | "pan-right"       // 右摇
  | "tilt-up"         // 上摇
  | "tilt-down"       // 下摇
  | "dolly-in"        // 推
  | "dolly-out"       // 拉
  | "tracking"        // 跟
  | "crane-up"        // 升
  | "crane-down"      // 降
  | "handheld"        // 手持
  | "orbit";          // 环绕

export type Composition =
  | "rule-of-thirds"  // 三分法
  | "center"          // 中心构图
  | "diagonal"        // 对角线
  | "frame-in-frame"  // 框架构图
  | "leading-lines"   // 引导线
  | "symmetry";       // 对称

export interface ShotCharacter {
  characterId?: number;   // references t_assets or t_character
  name: string;
  position: "left" | "center" | "right" | "foreground" | "background";
  facing: "camera" | "away" | "left" | "right" | "three-quarter";
  action: string;
  expression: string;
}
