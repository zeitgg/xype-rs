import { ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

type CheckForAppUpdatesOptions = {
  onProgress?: (progress: number) => void;
  userInitiated?: boolean;
};

export type AppUpdateResult =
  | { status: "latest" }
  | { status: "available"; version: string; body?: string }
  | { status: "installed"; version: string }
  | { status: "cancelled"; version: string }
  | { status: "error"; message: string };

let pendingUpdate: Update | null = null;

export async function checkForAppUpdates(): Promise<AppUpdateResult> {
  try {
    pendingUpdate = await check();

    if (!pendingUpdate) {
      return { status: "latest" };
    }

    return {
      status: "available",
      version: pendingUpdate.version,
      body: pendingUpdate.body?.trim(),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to check for updates.",
    };
  }
}

export async function installAppUpdate({
  onProgress,
}: CheckForAppUpdatesOptions = {}): Promise<AppUpdateResult> {
  try {
    const update = pendingUpdate ?? (await check());
    pendingUpdate = update;

    if (!pendingUpdate) {
      return { status: "latest" };
    }

    const releaseNotes = pendingUpdate.body?.trim();
    const shouldInstall = await ask(
      releaseNotes
        ? `xype ${pendingUpdate.version} is available.\n\n${releaseNotes}\n\nInstall now?`
        : `xype ${pendingUpdate.version} is available.\n\nInstall now?`,
      {
        title: "Update Available",
        kind: "info",
        okLabel: "Install",
        cancelLabel: "Later",
      },
    );

    if (!shouldInstall) {
      return { status: "cancelled", version: pendingUpdate.version };
    }

    let downloaded = 0;
    let total: number | undefined;
    await pendingUpdate.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength;
        onProgress?.(0);
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        if (total) onProgress?.(Math.round((downloaded / total) * 100));
      } else {
        onProgress?.(100);
      }
    });
    await relaunch();
    return { status: "installed", version: pendingUpdate.version };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to check for updates.",
    };
  }
}
