export type RuntimeState = "checking" | "missing" | "installing" | "ready" | "error";
export type ToolState = RuntimeState;

export type ProcessResult = {
  success: boolean;
  message: string;
  outputPath: string | null;
};

export type TrimSegment = {
  id: string;
  start: number;
  end: number;
};

export type MotionSettings = {
  interpolationEnabled: boolean;
  interpolateFps: number;
  interpolationSpeed: "medium" | "fast" | "faster" | "fastest";
  interpolationTuning: "film" | "animation" | "weak" | "smooth";
  interpolationAlgorithm: 2 | 13 | 23;
  interpolationGpu: boolean;
  frameBlendingEnabled: boolean;
  outputFps: number;
  blurIntensity: number;
  blendWeighting: "equal" | "gaussian" | "pyramid" | "vegas";
  flowblurEnabled: boolean;
  flowblurAmount: number;
  maskPreset: "none" | "valorant-minimal" | "valorant-detailed" | "custom";
  maskPath: string;
  encoder: "libx264" | "h264_nvenc";
  crf: number;
  timescale: number;
  trimStart: number;
  trimEnd: number;
  trimSegments: TrimSegment[];
};

export type BlurPreset = "subtle" | "recommended" | "strong";
export type UserMotionPreset = {
  id: string;
  name: string;
  settings: MotionSettings;
};
export type JobMode = "motion" | "trim" | "compress" | "discord" | "youtube" | "tiktok";

export type JobDefinition = {
  id: JobMode;
  label: string;
  shortLabel: string;
  description: string;
};

export const jobDefinitions: JobDefinition[] = [
  { id: "motion", label: "Motion Blur", shortLabel: "Blur", description: "Render a smoother version of a clip." },
  { id: "trim", label: "Trim", shortLabel: "Trim", description: "Cut a shorter clip without re-encoding." },
  { id: "compress", label: "Compress", shortLabel: "Zip", description: "Create a smaller upload-ready copy." },
  { id: "discord", label: "Discord 8 MB", shortLabel: "8 MB", description: "Compress a clip for Discord upload limits." },
  { id: "youtube", label: "YouTube 4K", shortLabel: "4K", description: "Create a 2160p upload copy for YouTube." },
  { id: "tiktok", label: "TikTok Quality", shortLabel: "TikTok", description: "Create a 1:1 quality patch for TikTok upload." },
];

export const defaultMotionSettings: MotionSettings = {
  interpolationEnabled: true,
  interpolateFps: 360,
  interpolationSpeed: "medium",
  interpolationTuning: "smooth",
  interpolationAlgorithm: 23,
  interpolationGpu: true,
  frameBlendingEnabled: true,
  outputFps: 60,
  blurIntensity: 1,
  blendWeighting: "gaussian",
  flowblurEnabled: false,
  flowblurAmount: 125,
  maskPreset: "none",
  maskPath: "",
  encoder: "libx264",
  crf: 18,
  timescale: 1,
  trimStart: 0,
  trimEnd: 10,
  trimSegments: [],
};

export const blurPresets: Record<BlurPreset, MotionSettings> = {
  subtle: {
    interpolationEnabled: true,
    interpolateFps: 240,
    interpolationSpeed: "medium",
    interpolationTuning: "weak",
    interpolationAlgorithm: 23,
    interpolationGpu: true,
    frameBlendingEnabled: true,
    outputFps: 60,
    blurIntensity: 0.65,
    blendWeighting: "gaussian",
    flowblurEnabled: false,
    flowblurAmount: 90,
    maskPreset: "none",
    maskPath: "",
    encoder: "libx264",
    crf: 18,
    timescale: 1,
    trimStart: 0,
    trimEnd: 10,
    trimSegments: [],
  },
  recommended: defaultMotionSettings,
  strong: {
    interpolationEnabled: true,
    interpolateFps: 480,
    interpolationSpeed: "medium",
    interpolationTuning: "smooth",
    interpolationAlgorithm: 23,
    interpolationGpu: true,
    frameBlendingEnabled: true,
    outputFps: 60,
    blurIntensity: 1.75,
    blendWeighting: "pyramid",
    flowblurEnabled: false,
    flowblurAmount: 150,
    maskPreset: "none",
    maskPath: "",
    encoder: "libx264",
    crf: 18,
    timescale: 1,
    trimStart: 0,
    trimEnd: 10,
    trimSegments: [],
  },
};
