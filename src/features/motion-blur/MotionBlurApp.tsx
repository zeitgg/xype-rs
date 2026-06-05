import { useEffect, useMemo, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon } from "@hugeicons/core-free-icons";
import packageJson from "@/package.json";
import { checkForAppUpdates } from "@/lib/updater";
import {
  checkMotionRuntime,
  checkFfmpegRuntime,
  getVideoFps,
  installFfmpegRuntime,
  installMotionRuntime,
  onFfmpegProgress,
  onRenderProgress,
  onRuntimeProgress,
  renderJob,
  validateFfmpeg,
} from "./api";
import { AppSettingsDialog, type UpdateState } from "./AppSettingsDialog";
import { JobSwitcher } from "./JobSwitcher";
import { pickFfmpeg, pickVideo } from "./file-dialog";
import { MotionSettingsPanel } from "./MotionSettingsPanel";
import { OnboardingTour } from "./OnboardingTour";
import { SourcePanel } from "./SourcePanel";
import { StatusPanel } from "./StatusPanel";
import { WindowControls } from "./WindowControls";
import {
  blurPresets,
  defaultMotionSettings,
  jobDefinitions,
  type BlurPreset,
  type JobMode,
  type MotionSettings,
  type RuntimeState,
  type ToolState,
} from "./types";

const savedFfmpeg = localStorage.getItem("xype.ffmpegPath") ?? "";
const appWindow = getCurrentWindow();
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
  const [ffmpegState, setFfmpegState] = useState<ToolState>("checking");
  const [ffmpegProgress, setFfmpegProgress] = useState(0);
  const [videoPath, setVideoPath] = useState("");
  const [inputFps, setInputFps] = useState<number | null>(null);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking");
  const [installProgress, setInstallProgress] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [settings, setSettings] = useState<MotionSettings>(defaultMotionSettings);
  const [preset, setPreset] = useState<BlurPreset>("recommended");
  const [mode, setMode] = useState<JobMode>("motion");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => localStorage.getItem("xype.onboardingComplete") !== "1",
  );
  const [updateState, setUpdateState] = useState<UpdateState>(defaultUpdateState);

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
    getVersion()
      .then((currentVersion) => setUpdateState((state) => ({ ...state, currentVersion })))
      .catch(() => undefined);
    void checkForUpdates(false);
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
      onFfmpegProgress(setFfmpegProgress),
      onRuntimeProgress(setInstallProgress),
      onRenderProgress((value) => setRenderProgress(Math.round(value * 100))),
    ]);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventDevtoolsShortcuts);
      void cleanups.then(([ffmpegUnlisten, runtimeUnlisten, renderUnlisten]) => {
        ffmpegUnlisten();
        runtimeUnlisten();
        renderUnlisten();
      });
    };
  }, []);

  async function checkForUpdates(userInitiated: boolean) {
    setUpdateState((state) => ({
      ...state,
      message: "Checking GitHub Releases for a signed update.",
      progress: 0,
      status: "checking",
    }));

    const result = await checkForAppUpdates({
      onProgress: (progress) => {
        setUpdateState((state) => ({
          ...state,
          message: `Downloading update (${progress}%).`,
          progress,
          status: "downloading",
        }));
      },
      userInitiated,
    });
    const checkedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (result.status === "latest") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: "You are on the latest version.",
        progress: 0,
        status: "latest",
        updateVersion: null,
      }));
    } else if (result.status === "available") {
      setUpdateState((state) => ({
        ...state,
        lastChecked: checkedAt,
        message: `Version ${result.version} is available.`,
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

  useEffect(() => {
    localStorage.setItem("xype.ffmpegPath", ffmpegPath);
    if (!ffmpegPath) {
      setFfmpegValid(null);
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
      ffmpegValid === true &&
      (mode !== "motion" || runtimeState === "ready") &&
      Boolean(videoPath) &&
      !processing,
    [ffmpegValid, mode, processing, runtimeState, videoPath],
  );

  async function installRuntime() {
    setRuntimeState("installing");
    setInstallProgress(0);
    setStatus("Installing engine");
    const result = await installMotionRuntime();
    setRuntimeState(result.success ? "ready" : "error");
    setStatus(result.message);
  }

  async function installFfmpeg() {
    setFfmpegState("installing");
    setFfmpegProgress(0);
    setStatus("Installing video tools");
    const result = await installFfmpegRuntime();
    if (result.success && result.outputPath) {
      setFfmpegPath(result.outputPath);
      setFfmpegState("ready");
    } else {
      setFfmpegState("error");
    }
    setStatus(result.message);
  }

  async function render() {
    if (!canRender) return;
    setProcessing(true);
    setRenderProgress(0);
    setOutputPath(null);
    setStatus("Rendering");

    try {
      const result = await renderJob(mode, ffmpegPath, videoPath, settings);
      setStatus(result.message);
      setOutputPath(result.outputPath);
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

  return (
    <main className="dark flex h-screen flex-col overflow-hidden bg-[#111214] text-white antialiased">
      <header className="flex h-11 shrink-0 items-stretch justify-between border-b border-white/[0.075] bg-[#18191c]">
        <div
          className="flex min-w-0 flex-1 items-center gap-2 px-3"
          data-tauri-drag-region
          onDoubleClick={() => void appWindow.toggleMaximize()}
        >
          <img alt="xype" className="h-5 w-5" src="/logo.png" />
          <div data-tour="modules">
            <JobSwitcher mode={mode} onChange={setMode} />
          </div>
        </div>
        <div className="flex items-center gap-2 pl-2 text-[11px] text-white/45">
          {status && <span>{status}</span>}
          <button
            className="rounded px-2 py-1 text-[11px] text-white/45 hover:bg-white/[0.07] hover:text-white"
            onClick={() => {
              setVideoPath("");
              setOutputPath(null);
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
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0" data-tour="source">
            <SourcePanel
              inputFps={inputFps}
              onChangeSettings={setSettings}
              onPickVideo={async () => {
                const selected = await pickVideo();
                if (selected) {
                  setVideoPath(selected);
                  setOutputPath(null);
                }
              }}
              settings={settings}
              videoPath={videoPath}
              mode={mode}
            />
          </div>
          <aside className="min-h-0 border-l border-white/[0.075] bg-[#17181b]" data-tour="properties">
            <MotionSettingsPanel
              mode={mode}
              onChange={setSettings}
              onPresetChange={choosePreset}
              preset={preset}
              settings={settings}
            />
          </aside>
        </div>

        <div data-tour="export">
          <StatusPanel
            actionLabel={mode === "trim" ? "Export Segment" : "Create Copy"}
            canRender={canRender}
            modeLabel={jobDefinitions.find((job) => job.id === mode)?.label ?? "Video"}
            onRender={render}
            outputPath={outputPath}
            processing={processing}
            progress={renderProgress}
            status={status}
          />
        </div>
      </section>
      <AppSettingsDialog
        ffmpegPath={ffmpegPath}
        ffmpegProgress={ffmpegProgress}
        ffmpegState={ffmpegState}
        ffmpegValid={ffmpegValid}
        installProgress={installProgress}
        onCheckForUpdates={() => {
          void checkForUpdates(true);
        }}
        onInstallFfmpeg={installFfmpeg}
        onInstallRuntime={installRuntime}
        onOpenChange={setSettingsOpen}
        onPickFfmpeg={async () => {
          const selected = await pickFfmpeg();
          if (selected) setFfmpegPath(selected);
        }}
        onSetFfmpegPath={setFfmpegPath}
        onShowOnboarding={() => {
          setSettingsOpen(false);
          setOnboardingOpen(true);
        }}
        open={settingsOpen}
        runtimeState={runtimeState}
        updateState={updateState}
      />
      {onboardingOpen && <OnboardingTour onClose={() => setOnboardingOpen(false)} />}
    </main>
  );
}
