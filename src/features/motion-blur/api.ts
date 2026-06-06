import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { JobMode, MotionSettings, ProcessResult, TrimSegment } from "./types";

export type EncoderSupport = {
  h264Nvenc: boolean;
};

export function validateFfmpeg(ffmpegPath: string) {
  return invoke<boolean>("validate_ffmpeg", { ffmpegPath });
}

export function checkEncoderSupport(ffmpegPath: string) {
  return invoke<EncoderSupport>("check_encoder_support", { ffmpegPath });
}

export function checkFfmpegRuntime() {
  return invoke<string | null>("check_ffmpeg_runtime");
}

export function installFfmpegRuntime() {
  return invoke<ProcessResult>("install_ffmpeg_runtime");
}

export function getVideoFps(ffmpegPath: string, videoPath: string) {
  return invoke<number>("get_video_fps", { ffmpegPath, videoPath });
}

export function checkMotionRuntime() {
  return invoke<boolean>("check_motion_runtime");
}

export function installMotionRuntime() {
  return invoke<ProcessResult>("install_motion_runtime");
}

export function renderMotionVideo(
  ffmpegPath: string,
  inputPath: string,
  settings: MotionSettings,
  output?: { outputDir: string; outputName: string },
) {
  return invoke<ProcessResult>("render_video_motion_runtime", {
    ffmpegPath,
    inputPath,
    interpolationEnabled: settings.interpolationEnabled,
    interpolateFps: settings.interpolateFps,
    interpolationSpeed: settings.interpolationSpeed,
    interpolationTuning: settings.interpolationTuning,
    interpolationAlgorithm: settings.interpolationAlgorithm,
    interpolationGpu: settings.interpolationGpu,
    frameBlendingEnabled: settings.frameBlendingEnabled,
    outputFps: settings.outputFps,
    blurIntensity: settings.blurIntensity,
    blendWeighting: settings.blendWeighting,
    flowblurEnabled: settings.flowblurEnabled,
    flowblurAmount: settings.flowblurAmount,
    encoder: settings.encoder,
    crf: settings.crf,
    timescale: settings.timescale,
    outputDir: output?.outputDir ?? null,
    outputName: output?.outputName ?? null,
    maskPreset: settings.maskPreset,
    maskPath: settings.maskPath,
    smoothieRecipe: null,
  });
}

export function trimSegmentForMotion(
  ffmpegPath: string,
  inputPath: string,
  segment: TrimSegment,
  index: number,
) {
  return invoke<ProcessResult>("trim_video_queue_segment", {
    ffmpegPath,
    inputPath,
    startSeconds: segment.start,
    endSeconds: segment.end,
    index,
  });
}

export function cleanupMotionQueueFile(path: string) {
  return invoke<void>("cleanup_motion_queue_file", { path });
}

export function renderJob(
  mode: JobMode,
  ffmpegPath: string,
  inputPath: string,
  settings: MotionSettings,
) {
  if (mode === "motion") {
    return renderMotionVideo(ffmpegPath, inputPath, settings);
  }
  if (mode === "trim") {
    const segments =
      settings.trimSegments.length > 0
        ? settings.trimSegments
        : [{ id: "active", start: settings.trimStart, end: settings.trimEnd }];

    return invoke<ProcessResult>("trim_video_segments", {
      ffmpegPath,
      inputPath,
      segments: segments.map(({ start, end }) => ({ start, end })),
    });
  }
  if (mode === "compress") {
    return invoke<ProcessResult>("compress_video_simple", { ffmpegPath, inputPath });
  }
  if (mode === "discord") {
    return invoke<ProcessResult>("compress_discord_simple", { ffmpegPath, inputPath });
  }
  if (mode === "youtube") {
    return invoke<ProcessResult>("upscale_youtube_4k_simple", { ffmpegPath, inputPath });
  }
  return invoke<ProcessResult>("tiktok_fps_simple", { ffmpegPath, inputPath, fps: 120 });
}

export function onRuntimeProgress(callback: (progress: number) => void) {
  return listen<number>("motion-runtime-progress", (event) => callback(event.payload));
}

export function onFfmpegProgress(callback: (progress: number) => void) {
  return listen<number>("ffmpeg-runtime-progress", (event) => callback(event.payload));
}

export function onRenderProgress(callback: (progress: number) => void) {
  return listen<number>("render-progress", (event) => callback(event.payload));
}
