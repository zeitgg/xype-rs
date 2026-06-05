export type RuntimeState = "checking" | "missing" | "installing" | "ready" | "error";
export type ToolState = RuntimeState;

export type ProcessResult = {
  success: boolean;
  message: string;
  outputPath: string | null;
};

export type MotionSettings = {
  interpolateFps: number;
  outputFps: number;
  framesToBlend: number;
  blendWeighting: "equal" | "gaussian" | "pyramid" | "vegas";
  encoder: "libx264" | "h264_nvenc";
  crf: number;
  timescale: number;
  trimStart: number;
  trimEnd: number;
};

export type BlurPreset = "subtle" | "recommended" | "strong";
export type JobMode = "motion" | "trim" | "compress" | "discord" | "youtube" | "tiktok";

export type JobDefinition = {
  id: JobMode;
  label: string;
  description: string;
};

export const jobDefinitions: JobDefinition[] = [
  { id: "motion", label: "Motion Blur", description: "Render a smoother version of a clip." },
  { id: "trim", label: "Trim", description: "Cut a shorter clip without re-encoding." },
  { id: "compress", label: "Compress", description: "Create a smaller upload-ready copy." },
  { id: "discord", label: "Discord 8 MB", description: "Compress a clip for Discord upload limits." },
  { id: "youtube", label: "YouTube 4K", description: "Create a 2160p upload copy for YouTube." },
  { id: "tiktok", label: "TikTok FPS", description: "Create an FPS-adjusted copy for TikTok." },
];

export const defaultMotionSettings: MotionSettings = {
  interpolateFps: 360,
  outputFps: 60,
  framesToBlend: 6,
  blendWeighting: "gaussian",
  encoder: "libx264",
  crf: 18,
  timescale: 1,
  trimStart: 0,
  trimEnd: 10,
};

export const blurPresets: Record<BlurPreset, MotionSettings> = {
  subtle: {
    interpolateFps: 240,
    outputFps: 60,
    framesToBlend: 4,
    blendWeighting: "gaussian",
    encoder: "libx264",
    crf: 18,
    timescale: 1,
    trimStart: 0,
    trimEnd: 10,
  },
  recommended: defaultMotionSettings,
  strong: {
    interpolateFps: 480,
    outputFps: 60,
    framesToBlend: 10,
    blendWeighting: "pyramid",
    encoder: "libx264",
    crf: 18,
    timescale: 1,
    trimStart: 0,
    trimEnd: 10,
  },
};
