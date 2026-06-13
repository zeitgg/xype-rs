import { useEffect, useMemo, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon } from "@hugeicons/core-free-icons";
import packageJson from "@/package.json";
import { checkForAppUpdates, installAppUpdate } from "@/lib/updater";
import {
  checkAppAccess,
  getAuthSession,
  logoutAuthSession,
  onAuthSessionUpdated,
  type AccessCheck,
  type PublicAuthSession,
} from "./account";
import {
  checkEncoderSupport,
  checkMotionRuntime,
  checkFfmpegRuntime,
  cleanupMotionQueueFile,
  getVideoFps,
  installFfmpegRuntime,
  installMotionRuntime,
  onFfmpegProgress,
  onRenderProgress,
  onRuntimeProgress,
  renderMotionVideo,
  renderJob,
  trimSegmentForMotion,
  type EncoderSupport,
  validateFfmpeg,
} from "./api";
import { AppSettingsDialog, type UpdateState } from "./AppSettingsDialog";
import { ExportCompleteDialog } from "./ExportCompleteDialog";
import { JobSwitcher } from "./JobSwitcher";
import { JobProgressToast } from "./JobProgressToast";
import {
  pickFfmpeg,
  pickMaskPng,
  pickPresetFile,
  pickVideo,
  pickVideos,
  readTextFile,
  savePresetFile,
  writeTextFile,
} from "./file-dialog";
import { MotionSettingsPanel } from "./MotionSettingsPanel";
import { OnboardingTour } from "./OnboardingTour";
import { SourcePanel } from "./SourcePanel";
import { StatusPanel } from "./StatusPanel";
import { SubscriptionGate } from "./SubscriptionGate";
import { WindowControls } from "./WindowControls";
import {
  blurPresets,
  defaultMotionSettings,
  jobDefinitions,
  type BlurPreset,
  type JobMode,
  type MotionSettings,
  type RuntimeState,
  type TrimSegment,
  type ToolState,
  type UserMotionPreset,
} from "./types";

const savedFfmpeg = localStorage.getItem("xype.ffmpegPath") ?? "";
const appWindow = getCurrentWindow();
const appWebview = getCurrentWebview();
const userPresetsStorageKey = "xype.motionPresets";
const defaultUpdateState: UpdateState = {
  currentVersion: packageJson.version,
  lastChecked: null,
  message: "Updates are checked automatically when xype starts.",
  progress: 0,
  status: "idle",
  updateVersion: null,
};

export function MotionBlurApp() {
  const [ffmpegPath, setFfmpegPath] = useState(savedFfmpeg);
  const [ffmpegValid, setFfmpegValid] = useState<boolean | null>(null);
  const [encoderSupport, setEncoderSupport] = useState<EncoderSupport | null>(null);
  const [ffmpegState, setFfmpegState] = useState<ToolState>("checking");
  const [ffmpegProgress, setFfmpegProgress] = useState(0);
  const [videoPaths, setVideoPaths] = useState<Record<JobMode, string>>(createEmptyVideoPaths);
  const [inputFps, setInputFps] = useState<number | null>(null);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking");
  const [installProgress, setInstallProgress] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [currentJobLabel, setCurrentJobLabel] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [outputPaths, setOutputPaths] = useState<string[]>([]);
  const [settings, setSettings] = useState<MotionSettings>(defaultMotionSettings);
  const [motionQueueFiles, setMotionQueueFiles] = useState<string[]>([]);
  const [userPresets, setUserPresets] = useState<UserMotionPreset[]>(loadUserPresets);
  const [preset, setPreset] = useState<BlurPreset>("recommended");
  const [mode, setMode] = useState<JobMode>("motion");
  const modeRef = useRef<JobMode>("motion");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportCompleteOpen, setExportCompleteOpen] = useState(false);
  const [authSession, setAuthSession] = useState<PublicAuthSession | null>(null);
  const [accessState, setAccessState] = useState<AccessCheck | null>(null);
  const [accessChecking, setAccessChecking] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => localStorage.getItem("xype.onboardingComplete") !== "1",
  );
  const [updateState, setUpdateState] = useState<UpdateState>(defaultUpdateState);
  const videoPath = videoPaths[mode];
  const outputPath = outputPaths[outputPaths.length - 1] ?? null;

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    const preventDevtoolsShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "F12" || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key))) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("keydown", preventDevtoolsShortcuts);
    void refreshAccount();
    getVersion()
      .then((currentVersion) => setUpdateState((state) => ({ ...state, currentVersion })))
      .catch(() => undefined);
    void checkForUpdates();
    checkFfmpegRuntime()
      .then((path) => {
        if (path) {
          setFfmpegPath(path);
          setFfmpegState("ready");
        } else {
          setFfmpegState("missing");
        }
      })
      .catch(() => setFfmpegState("error"));
    checkMotionRuntime()
      .then((installed) => setRuntimeState(installed ? "ready" : "missing"))
      .catch(() => setRuntimeState("error"));

    const cleanups = Promise.all([
      appWebview.onDragDropEvent((event) => {
        if (event.payload.type !== "drop") return;

        const videos = event.payload.paths.filter(isVideoFile);
        if (videos.length === 0) {
          setStatus("Drop a video file.");
          return;
        }

        setVideoForMode(modeRef.current, videos[0]);
        setFinishedOutputs([]);
        if (videos.length > 1) {
          addMotionQueueFiles(videos);
          setStatus(`Added ${videos.length} clips to Motion Queue.`);
        } else {
          setStatus("Loaded video.");
        }
      }),
      onAuthSessionUpdated((session) => {
        setAuthSession(session);
        void refreshAccount();
      }),
      onFfmpegProgress(setFfmpegProgress),
      onRuntimeProgress(setInstallProgress),
      onRenderProgress((value) => setRenderProgress(Math.round(value * 100))),
    ]);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventDevtoolsShortcuts);
      void cleanups.then(([dropUnlisten, authUnlisten, ffmpegUnlisten, runtimeUnlisten, renderUnlisten]) => {
        dropUnlisten();
        authUnlisten();
        ffmpegUnlisten();
        runtimeUnlisten();
        renderUnlisten();
      });
    };
  }, []);

  useEffect(() => {
    if (accessState?.access) return;

    const interval = window.setInterval(() => {
      void refreshAccount();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [accessState?.access]);

  async function refreshAccount() {
    setAccessChecking(true);
    try {
      const [session, access] = await Promise.all([getAuthSession(), checkAppAccess()]);
      setAuthSession(session);
      setAccessState(access);
    } catch (error) {
      setAccessState({
        access: false,
        auth: false,
        error: error instanceof Error ? error.message : "Account check failed.",
        subscription: false,
      });
    } finally {
      setAccessChecking(false);
    }
  }

  async function logoutAccount() {
    await logoutAuthSession();
    setAuthSession(null);
    setAccessState({
      access: false,
      auth: false,
      error: "Logged out.",
      subscription: false,
    });
  }

  function openLogin() {
    void openUrl("https://xype.gg/login");
  }

  async function checkForUpdates() {
    setUpdateState((state) => ({
      ...state,
      message: "Checking GitHub Releases for a signed update.",
      progress: 0,
      status: "checking",
    }));

    const result = await checkForAppUpdates();
    const checkedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (result.status === "latest") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: "No update needed. You are running the latest release.",
        progress: 0,
        status: "latest",
        updateVersion: null,
      }));
    } else if (result.status === "available") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: result.body ? `Version ${result.version} is ready to install.` : `Version ${result.version} is available.`,
        progress: 0,
        status: "available",
        updateVersion: result.version,
      }));
    } else if (result.status === "cancelled") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: `Version ${result.version} is available. Install was skipped.`,
        progress: 0,
        status: "available",
        updateVersion: result.version,
      }));
    } else if (result.status === "installed") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: `Version ${result.version} installed. Restarting xype.`,
        progress: 100,
        status: "downloading",
        updateVersion: result.version,
      }));
    } else {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: result.message,
        progress: 0,
        status: "error",
      }));
    }
  }

  async function installAvailableUpdate() {
    setUpdateState((state) => ({
      ...state,
      message: "Preparing the signed update.",
      progress: 0,
      status: "downloading",
    }));

    const result = await installAppUpdate({
      onProgress: (progress) => {
        setUpdateState((state) => ({
          ...state,
          message: `Installing update (${progress}%).`,
          progress,
          status: "downloading",
        }));
      },
    });
    const checkedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (result.status === "latest") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: "No update needed. You are running the latest release.",
        progress: 0,
        status: "latest",
        updateVersion: null,
      }));
    } else if (result.status === "cancelled") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: `Version ${result.version} is still available.`,
        progress: 0,
        status: "available",
        updateVersion: result.version,
      }));
    } else if (result.status === "installed") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: `Version ${result.version} installed. Restarting xype.`,
        progress: 100,
        status: "downloading",
        updateVersion: result.version,
      }));
    } else if (result.status === "available") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: `Version ${result.version} is ready to install.`,
        progress: 0,
        status: "available",
        updateVersion: result.version,
      }));
    } else {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: result.message,
        progress: 0,
        status: "error",
      }));
    }
  }

  useEffect(() => {
    localStorage.setItem("xype.ffmpegPath", ffmpegPath);
    if (!ffmpegPath) {
      setFfmpegValid(null);
      setEncoderSupport(null);
      return;
    }

    let active = true;
    validateFfmpeg(ffmpegPath)
      .then((valid) => {
        if (!active) return;
        setFfmpegValid(valid);
        if (valid) setFfmpegState("ready");
      })
      .catch(() => {
        if (!active) return;
        setFfmpegValid(false);
        setFfmpegState("error");
      });

    return () => {
      active = false;
    };
  }, [ffmpegPath]);

  useEffect(() => {
    if (ffmpegValid !== true || !ffmpegPath) {
      setEncoderSupport(null);
      return;
    }

    let active = true;
    checkEncoderSupport(ffmpegPath)
      .then((support) => {
        if (!active) return;
        setEncoderSupport(support);
        if (!support.h264Nvenc) {
          setSettings((value) =>
            value.encoder === "h264_nvenc" ? { ...value, encoder: "libx264" } : value,
          );
        }
      })
      .catch(() => {
        if (!active) return;
        setEncoderSupport({ h264Nvenc: false });
        setSettings((value) =>
          value.encoder === "h264_nvenc" ? { ...value, encoder: "libx264" } : value,
        );
      });

    return () => {
      active = false;
    };
  }, [ffmpegPath, ffmpegValid]);

  useEffect(() => {
    if (!ffmpegValid || !ffmpegPath || !videoPath) {
      setInputFps(null);
      return;
    }

    let active = true;
    getVideoFps(ffmpegPath, videoPath)
      .then((fps) => active && setInputFps(fps))
      .catch(() => active && setInputFps(null));

    return () => {
      active = false;
    };
  }, [ffmpegPath, ffmpegValid, videoPath]);

  const canRender = useMemo(
    () =>
      (mode === "tiktok" || ffmpegValid === true) &&
      (mode !== "motion" || runtimeState === "ready") &&
      Boolean(videoPath) &&
      !processing,
    [ffmpegValid, mode, processing, runtimeState, videoPath],
  );
  const activeJobLabel = jobDefinitions.find((job) => job.id === mode)?.label ?? "Video";

  async function installRuntime() {
    setRuntimeState("installing");
    setInstallProgress(0);
    setStatus("Installing engine");
    const result = await installMotionRuntime();
    if (!result.success) {
      setRuntimeState("error");
      setStatus(result.message);
      return;
    }

    const installed = await checkMotionRuntime().catch(() => false);
    setRuntimeState(installed ? "ready" : "error");
    setStatus(installed ? result.message : "Motion engine installed, but could not be verified.");
  }

  async function installFfmpeg() {
    setFfmpegState("installing");
    setFfmpegProgress(0);
    setStatus("Installing video tools");
    const result = await installFfmpegRuntime();
    if (result.success && result.outputPath) {
      setFfmpegPath(result.outputPath);
      const valid = await validateFfmpeg(result.outputPath).catch(() => false);
      setFfmpegValid(valid);
      setFfmpegState(valid ? "ready" : "error");
      setStatus(valid ? result.message : "Video tools installed, but ffmpeg could not be verified.");
    } else {
      setFfmpegState("error");
      setFfmpegValid(false);
      setStatus(result.message);
    }
  }

  async function render() {
    if (!canRender) return;
    const renderMode = mode;
    const renderJobLabel = activeJobLabel;
    const safeSettings = normalizeMotionSettings(settings);
    const renderSettings =
      safeSettings.encoder === "h264_nvenc" && encoderSupport?.h264Nvenc === false
        ? { ...safeSettings, encoder: "libx264" as const }
        : safeSettings;
    setProcessing(true);
    setCurrentJobLabel(renderJobLabel);
    setRenderProgress(0);
    setFinishedOutputs([]);
    setStatus("Rendering");

    try {
      const result = await renderJob(renderMode, ffmpegPath, videoPath, renderSettings);
      setStatus(result.message);
      setFinishedOutputs(result.success && result.outputPath ? [result.outputPath] : []);
      setExportCompleteOpen(result.success && Boolean(result.outputPath));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setProcessing(false);
    }
  }

  function choosePreset(nextPreset: BlurPreset) {
    setPreset(nextPreset);
    setSettings({
      ...blurPresets[nextPreset],
      encoder: settings.encoder,
    });
  }

  async function sendSegmentsToMotion(segments: TrimSegment[]) {
    if (processing) {
      setStatus("Finish the current export first.");
      return;
    }
    if (!videoPath || !ffmpegPath || ffmpegValid !== true || runtimeState !== "ready") {
      setStatus("Choose a video and install the motion tools first.");
      return;
    }

    const validSegments = segments.filter((segment) => segment.end > segment.start);
    if (validSegments.length === 0) {
      setStatus("Select at least one segment.");
      return;
    }

    const outputDir = parentDirectory(videoPath);
    const inputName = fileStem(videoPath);
    const safeSettings = normalizeMotionSettings(settings);
    const renderSettings =
      safeSettings.encoder === "h264_nvenc" && encoderSupport?.h264Nvenc === false
        ? { ...safeSettings, encoder: "libx264" as const }
        : safeSettings;

    setProcessing(true);
    setRenderProgress(0);
    setFinishedOutputs([]);

    const outputs: string[] = [];
    try {
      for (const [index, segment] of validSegments.entries()) {
        const jobNumber = index + 1;
        const jobLabel = `Motion Blur ${jobNumber}/${validSegments.length}`;
        let tempPath: string | null = null;
        try {
          setCurrentJobLabel(jobLabel);
          setStatus(`Preparing segment ${jobNumber}/${validSegments.length}`);
          setRenderProgress(0);

          const trimResult = await trimSegmentForMotion(ffmpegPath, videoPath, segment, jobNumber);
          if (!trimResult.success || !trimResult.outputPath) {
            throw new Error(trimResult.message);
          }
          tempPath = trimResult.outputPath;

          setStatus(`Rendering segment ${jobNumber}/${validSegments.length}`);
          const result = await renderMotionVideo(ffmpegPath, tempPath, renderSettings, {
            outputDir,
            outputName: `${inputName}_segment_${String(jobNumber).padStart(2, "0")}_motion`,
          });
          if (!result.success || !result.outputPath) {
            throw new Error(result.message);
          }
          outputs.push(result.outputPath);
        } finally {
          if (tempPath) await cleanupMotionQueueFile(tempPath).catch(() => undefined);
        }
      }

      setStatus(`Finished ${outputs.length} motion blur ${outputs.length === 1 ? "clip" : "clips"}`);
      setFinishedOutputs(outputs);
      setExportCompleteOpen(outputs.length > 0);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setProcessing(false);
    }
  }

  async function runMotionFileQueue(files: string[]) {
    if (processing) {
      setStatus("Finish the current export first.");
      return;
    }
    if (!ffmpegPath || ffmpegValid !== true || runtimeState !== "ready") {
      setStatus("Install the motion tools first.");
      return;
    }

    const validFiles = files.filter(Boolean);
    if (validFiles.length === 0) {
      setStatus("Add clips to the Motion Queue first.");
      return;
    }

    const safeSettings = normalizeMotionSettings(settings);
    const renderSettings =
      safeSettings.encoder === "h264_nvenc" && encoderSupport?.h264Nvenc === false
        ? { ...safeSettings, encoder: "libx264" as const }
        : safeSettings;

    setProcessing(true);
    setRenderProgress(0);
    setFinishedOutputs([]);

    const outputs: string[] = [];
    try {
      for (const [index, file] of validFiles.entries()) {
        const jobNumber = index + 1;
        setCurrentJobLabel(`Motion Blur ${jobNumber}/${validFiles.length}`);
        setStatus(`Rendering clip ${jobNumber}/${validFiles.length}`);
        setRenderProgress(0);

        const result = await renderMotionVideo(ffmpegPath, file, renderSettings, {
          outputDir: parentDirectory(file),
          outputName: `${fileStem(file)}_motion`,
        });
        if (!result.success || !result.outputPath) {
          throw new Error(result.message);
        }
        outputs.push(result.outputPath);
      }

      setMotionQueueFiles((queuedFiles) => queuedFiles.filter((file) => !validFiles.includes(file)));
      setStatus(`Finished ${outputs.length} motion blur ${outputs.length === 1 ? "clip" : "clips"}`);
      setFinishedOutputs(outputs);
      setExportCompleteOpen(outputs.length > 0);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setProcessing(false);
    }
  }

  function addMotionQueueFiles(files: string[]) {
    setMotionQueueFiles((queuedFiles) => {
      const nextFiles = [...queuedFiles];
      for (const file of files) {
        if (file && !nextFiles.includes(file)) nextFiles.push(file);
      }
      return nextFiles;
    });
  }

  function removeMotionQueueFile(path: string) {
    setMotionQueueFiles((files) => files.filter((file) => file !== path));
  }

  function setFinishedOutputs(paths: string[]) {
    setOutputPaths(paths.filter(Boolean));
  }

  function setVideoForMode(targetMode: JobMode, path: string) {
    setVideoPaths((paths) => ({
      ...paths,
      [targetMode]: path,
    }));
  }

  function saveUserPreset() {
    setUserPresets((presets) => {
      const name = `Preset ${presets.length + 1}`;
      const presetSettings = normalizeMotionSettings(settings);
      const nextPresets = [
        ...presets,
        {
          id: crypto.randomUUID(),
          name,
          settings: presetSettings,
        },
      ];
      localStorage.setItem(userPresetsStorageKey, JSON.stringify(nextPresets));
      setStatus(`Saved preset: ${name}`);
      return nextPresets;
    });
  }

  async function importPreset() {
    try {
      const path = await pickPresetFile();
      if (!path) return;

      const imported = parsePresetFile(await readTextFile(path));
      setSettings(imported.settings);
      setUserPresets((presets) => {
        const nextPresets = [...presets, imported];
        localStorage.setItem(userPresetsStorageKey, JSON.stringify(nextPresets));
        return nextPresets;
      });
      setStatus(`Imported preset: ${imported.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import preset.");
    }
  }

  async function exportPreset() {
    try {
      const path = await savePresetFile("xype-motion-preset.vro");
      if (!path) return;

      const preset = {
        app: "xype",
        kind: "motion-preset",
        version: 1,
        name: "Motion preset",
        settings: normalizeMotionSettings(settings),
      };
      await writeTextFile(path, JSON.stringify(preset, null, 2));
      setStatus("Exported .vro preset");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not export preset.");
    }
  }

  async function pickMask() {
    const maskPath = await pickMaskPng();
    if (!maskPath) return;
    setSettings((value) => ({
      ...value,
      maskPath,
      maskPreset: "custom",
    }));
    setStatus("Mask PNG selected");
  }

  return (
    <main className="dark flex h-screen flex-col overflow-hidden bg-[#111214] text-white antialiased">
      <header className="flex h-11 shrink-0 items-stretch justify-between border-b border-white/[0.075] bg-[#18191c]">
        <div
          className="flex min-w-0 flex-1 items-center gap-2 px-3"
          data-tauri-drag-region
          onDoubleClick={() => void appWindow.toggleMaximize()}
        >
          <img alt="xype" className="h-5 w-5" src="/logo.png" />
          <div className="h-full min-w-0" data-tour="modules">
            <JobSwitcher mode={mode} onChange={setMode} />
          </div>
        </div>
        <div className="flex items-center gap-1 pl-2 text-[11px] text-white/45">
          <button
            aria-label="Reset"
            className="rounded px-2 py-1 text-[11px] text-white/45 hover:bg-white/[0.07] hover:text-white"
            onClick={() => {
              setVideoForMode(mode, "");
              setFinishedOutputs([]);
              setStatus("");
            }}
            type="button"
          >
            Reset
          </button>
          <button
            aria-label="Settings"
            className="flex size-8 items-center justify-center rounded text-white/45 hover:bg-white/[0.07] hover:text-white"
            data-tour="settings"
            onClick={() => setSettingsOpen(true)}
            onMouseDown={(event) => event.stopPropagation()}
            title="Settings"
            type="button"
          >
            <HugeiconsIcon className="size-4" icon={Settings02Icon} />
          </button>
          <WindowControls />
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_clamp(360px,28vw,430px)]">
          <div className="h-full min-h-0" data-tour="source">
            <SourcePanel
              inputFps={inputFps}
              onChangeSettings={setSettings}
              onPickVideo={async () => {
                const selected = await pickVideo();
                if (selected) {
                  setVideoForMode(mode, selected);
                  setFinishedOutputs([]);
                }
              }}
              settings={settings}
              videoPath={videoPath}
              mode={mode}
            />
          </div>
          <aside className="min-h-0 border-l border-white/[0.075] bg-[#17181b]" data-tour="properties">
            <MotionSettingsPanel
              encoderSupport={encoderSupport}
              mode={mode}
              motionQueueFiles={motionQueueFiles}
              onAddMotionFiles={async () => {
                addMotionQueueFiles(await pickVideos());
              }}
              onChange={setSettings}
              onExportPreset={() => {
                void exportPreset();
              }}
              onImportPreset={() => {
                void importPreset();
              }}
              onPickMask={() => {
                void pickMask();
              }}
              onPresetChange={choosePreset}
              onRemoveMotionFile={removeMotionQueueFile}
              onRunMotionFiles={(files) => {
                void runMotionFileQueue(files);
              }}
              onSavePreset={saveUserPreset}
              onSendSegmentsToMotion={(segments) => {
                void sendSegmentsToMotion(segments);
              }}
              preset={preset}
              settings={settings}
              userPresets={userPresets}
            />
          </aside>
        </div>

        <div className="shrink-0" data-tour="export">
          <StatusPanel
            actionLabel={mode === "trim" ? "Export Segment" : "Create Copy"}
            canRender={canRender}
            modeLabel={activeJobLabel}
            onRender={render}
            outputPath={outputPath}
            processing={processing}
            progress={renderProgress}
          />
        </div>
      </section>
      <AppSettingsDialog
        access={accessState}
        accountChecking={accessChecking}
        ffmpegPath={ffmpegPath}
        ffmpegProgress={ffmpegProgress}
        ffmpegState={ffmpegState}
        ffmpegValid={ffmpegValid}
        installProgress={installProgress}
        onCheckForUpdates={() => {
          void checkForUpdates();
        }}
        onInstallUpdate={() => {
          void installAvailableUpdate();
        }}
        onInstallFfmpeg={installFfmpeg}
        onInstallRuntime={installRuntime}
        onLogin={openLogin}
        onLogout={() => {
          void logoutAccount();
        }}
        onOpenChange={setSettingsOpen}
        onPickFfmpeg={async () => {
          const selected = await pickFfmpeg();
          if (selected) setFfmpegPath(selected);
        }}
        onRefreshAccount={() => {
          void refreshAccount();
        }}
        onSetFfmpegPath={setFfmpegPath}
        onShowOnboarding={() => {
          setSettingsOpen(false);
          setOnboardingOpen(true);
        }}
        open={settingsOpen}
        runtimeState={runtimeState}
        session={authSession}
        updateState={updateState}
      />
      <ExportCompleteDialog
        onOpenChange={setExportCompleteOpen}
        open={exportCompleteOpen}
        outputPaths={outputPaths}
      />
      <JobProgressToast
        jobLabel={currentJobLabel ?? activeJobLabel}
        processing={processing}
        progress={renderProgress}
        status={status}
      />
      {onboardingOpen && (
        <OnboardingTour
          ffmpegProgress={ffmpegProgress}
          ffmpegState={ffmpegState}
          ffmpegValid={ffmpegValid}
          installProgress={installProgress}
          onClose={() => setOnboardingOpen(false)}
          onInstallFfmpeg={installFfmpeg}
          onInstallRuntime={installRuntime}
          runtimeState={runtimeState}
        />
      )}
      {!accessState?.access && (
        <SubscriptionGate
          access={accessState}
          checking={accessChecking}
          onRetry={() => {
            void refreshAccount();
          }}
          session={authSession}
        />
      )}
    </main>
  );
}

function loadUserPresets(): UserMotionPreset[] {
  try {
    const raw = localStorage.getItem(userPresetsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Partial<UserMotionPreset> & { name: string; settings: Partial<MotionSettings> } =>
        Boolean(
          item &&
            typeof item === "object" &&
            "name" in item &&
            typeof item.name === "string" &&
            "settings" in item &&
            item.settings &&
            typeof item.settings === "object",
        ),
      )
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        name: item.name,
        settings: normalizeMotionSettings(item.settings),
      }));
  } catch {
    return [];
  }
}

function parsePresetFile(contents: string): UserMotionPreset {
  const parsed = JSON.parse(contents) as {
    name?: unknown;
    settings?: unknown;
  };
  if (!parsed.settings || typeof parsed.settings !== "object") {
    throw new Error("Invalid .vro preset.");
  }

  return {
    id: crypto.randomUUID(),
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "Imported preset",
    settings: normalizeMotionSettings(parsed.settings as Partial<MotionSettings>),
  };
}

function normalizeMotionSettings(settings: Partial<MotionSettings>): MotionSettings {
  const next = {
    ...defaultMotionSettings,
    ...settings,
    interpolationEnabled: booleanValue(settings.interpolationEnabled, defaultMotionSettings.interpolationEnabled),
    interpolateFps: clampNumber(settings.interpolateFps, 60, 960, defaultMotionSettings.interpolateFps),
    interpolationSpeed: enumValue(
      settings.interpolationSpeed,
      ["medium", "fast", "faster", "fastest"],
      defaultMotionSettings.interpolationSpeed,
    ),
    interpolationTuning: enumValue(
      settings.interpolationTuning,
      ["film", "animation", "weak", "smooth"],
      defaultMotionSettings.interpolationTuning,
    ),
    interpolationAlgorithm: enumNumber(
      settings.interpolationAlgorithm,
      [2, 13, 23],
      defaultMotionSettings.interpolationAlgorithm,
    ),
    interpolationGpu: booleanValue(settings.interpolationGpu, defaultMotionSettings.interpolationGpu),
    frameBlendingEnabled: booleanValue(
      settings.frameBlendingEnabled,
      defaultMotionSettings.frameBlendingEnabled,
    ),
    outputFps: clampNumber(settings.outputFps, 24, 240, defaultMotionSettings.outputFps),
    blurIntensity: clampNumber(settings.blurIntensity, 0, 4, defaultMotionSettings.blurIntensity),
    blendWeighting: enumValue(
      settings.blendWeighting,
      ["equal", "gaussian", "pyramid", "vegas"],
      defaultMotionSettings.blendWeighting,
    ),
    flowblurEnabled: booleanValue(settings.flowblurEnabled, defaultMotionSettings.flowblurEnabled),
    flowblurAmount: clampNumber(settings.flowblurAmount, 0, 200, defaultMotionSettings.flowblurAmount),
    maskPreset: enumValue(
      settings.maskPreset,
      ["none", "valorant-minimal", "valorant-detailed", "custom"],
      defaultMotionSettings.maskPreset,
    ),
    maskPath: typeof settings.maskPath === "string" ? settings.maskPath : defaultMotionSettings.maskPath,
    encoder: enumValue(settings.encoder, ["libx264", "h264_nvenc"], defaultMotionSettings.encoder),
    crf: clampNumber(settings.crf, 1, 35, defaultMotionSettings.crf),
    timescale: clampNumber(settings.timescale, 0.25, 8, defaultMotionSettings.timescale),
    compressMode: enumValue(
      settings.compressMode,
      ["balanced", "small", "high"],
      defaultMotionSettings.compressMode,
    ),
    compressCrf: clampNumber(settings.compressCrf, 16, 32, defaultMotionSettings.compressCrf),
    compressPreset: enumValue(
      settings.compressPreset,
      ["veryfast", "fast", "medium", "slow"],
      defaultMotionSettings.compressPreset,
    ),
    compressMaxHeight: enumValue(
      settings.compressMaxHeight,
      ["source", "2160", "1440", "1080", "720", "480"],
      defaultMotionSettings.compressMaxHeight,
    ),
    compressFps: enumValue(settings.compressFps, ["source", "60", "30"], defaultMotionSettings.compressFps),
    compressAudioBitrate: enumNumber(
      settings.compressAudioBitrate,
      [96, 128, 160, 192, 256, 320],
      defaultMotionSettings.compressAudioBitrate,
    ),
    compressFastStart: booleanValue(settings.compressFastStart, defaultMotionSettings.compressFastStart),
    trimStart: clampNumber(settings.trimStart, 0, Number.MAX_SAFE_INTEGER, defaultMotionSettings.trimStart),
    trimEnd: clampNumber(settings.trimEnd, 0.05, Number.MAX_SAFE_INTEGER, defaultMotionSettings.trimEnd),
    trimSegments: normalizeTrimSegments(settings.trimSegments),
  };

  if (next.interpolateFps < next.outputFps) next.interpolateFps = next.outputFps;
  if (next.trimEnd <= next.trimStart) next.trimEnd = next.trimStart + 0.05;
  if (next.maskPreset !== "custom") next.maskPath = "";

  const hasMotionEffect =
    (next.interpolationEnabled && next.interpolateFps > 0) ||
    (next.frameBlendingEnabled && next.blurIntensity > 0) ||
    (next.flowblurEnabled && next.flowblurAmount > 0);
  if (!hasMotionEffect) {
    next.frameBlendingEnabled = true;
    next.blurIntensity = defaultMotionSettings.blurIntensity;
  }

  return next;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true" || value.toLowerCase() === "yes") return true;
    if (value.toLowerCase() === "false" || value.toLowerCase() === "no") return false;
  }
  return fallback;
}

function enumValue<TValue extends string>(value: unknown, options: readonly TValue[], fallback: TValue): TValue {
  return typeof value === "string" && options.includes(value as TValue) ? (value as TValue) : fallback;
}

function enumNumber<TValue extends number>(value: unknown, options: readonly TValue[], fallback: TValue): TValue {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return options.includes(parsed as TValue) ? (parsed as TValue) : fallback;
}

function normalizeTrimSegments(value: unknown): TrimSegment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((segment) => {
      if (!segment || typeof segment !== "object") return null;
      const start = clampNumber((segment as Partial<TrimSegment>).start, 0, Number.MAX_SAFE_INTEGER, 0);
      const end = clampNumber((segment as Partial<TrimSegment>).end, 0, Number.MAX_SAFE_INTEGER, 0);
      if (end <= start) return null;
      return {
        id: typeof (segment as Partial<TrimSegment>).id === "string" ? (segment as TrimSegment).id : crypto.randomUUID(),
        start,
        end,
      };
    })
    .filter((segment): segment is TrimSegment => Boolean(segment))
    .sort((a, b) => a.start - b.start);
}

function createEmptyVideoPaths(): Record<JobMode, string> {
  return {
    motion: "",
    trim: "",
    compress: "",
    discord: "",
    youtube: "",
    tiktok: "",
  };
}

function parentDirectory(path: string) {
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return index > 0 ? path.slice(0, index) : ".";
}

function fileStem(path: string) {
  const fileName = path.slice(Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/")) + 1);
  const dotIndex = fileName.lastIndexOf(".");
  return (dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName).replace(/[<>:"/\\|?*]/g, "_") || "clip";
}

function isVideoFile(path: string) {
  return /\.(mp4|mov|mkv|avi|webm)$/i.test(path);
}
