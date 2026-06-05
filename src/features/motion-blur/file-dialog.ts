import { invoke } from "@tauri-apps/api/core";

export function pickFfmpeg() {
  return invoke<string | null>("pick_file", { kind: "ffmpeg" });
}

export function pickVideo() {
  return invoke<string | null>("pick_file", { kind: "video" });
}
