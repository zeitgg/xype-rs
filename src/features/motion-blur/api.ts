import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { JobMode, MotionSettings, ProcessResult } from "./types";

export function validateFfmpeg(ffmpegPath: string) {
  return invoke<boolean>("validate_ffmpeg", { ffmpegPath });
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
) {
  return invoke<ProcessResult>("render_video_motion_runtime", {
    ffmpegPath,
    inputPath,
    interpolateFps: settings.interpolateFps,
    outputFps: settings.outputFps,
    framesToBlend: settings.framesToBlend,
    blendWeighting: settings.blendWeighting,
    encoder: settings.encoder,
    crf: settings.crf,
    timescale: settings.timescale,
    smoothieRecipe: null,
  });
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
    return invoke<ProcessResult>("trim_video_simple", {
      ffmpegPath,
      inputPath,
      startSeconds: settings.trimStart,
      endSeconds: settings.trimEnd,
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
