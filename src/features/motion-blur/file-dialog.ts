import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export function pickFfmpeg() {
  return invoke<string | null>("pick_file", { kind: "ffmpeg" });
}

export function pickVideo() {
  return invoke<string | null>("pick_file", { kind: "video" });
}

export async function pickVideos() {
  const selected = await open({
    multiple: true,
    filters: [{ name: "Video files", extensions: ["mp4", "mov", "mkv", "avi", "webm"] }],
  });

  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}

export function pickMaskPng() {
  return invoke<string | null>("pick_file", { kind: "mask" });
}

export function pickPresetFile() {
  return invoke<string | null>("pick_file", { kind: "preset" });
}

export function readTextFile(path: string) {
  return invoke<string>("read_text_file", { path });
}

export function writeTextFile(path: string, contents: string) {
  return invoke<void>("write_text_file", { path, contents });
}

export function savePresetFile(defaultName: string) {
  return save({
    defaultPath: defaultName.endsWith(".vro") ? defaultName : `${defaultName}.vro`,
    filters: [{ name: "xype preset", extensions: ["vro"] }],
  });
}
