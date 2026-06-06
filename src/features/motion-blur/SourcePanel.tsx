import { jobDefinitions, type JobMode, type MotionSettings } from "./types";
import { TrimViewer } from "./TrimViewer";

type Props = {
  inputFps: number | null;
  mode: JobMode;
  onChangeSettings: (settings: MotionSettings) => void;
  onPickVideo: () => void;
  settings: MotionSettings;
  videoPath: string;
};

export function SourcePanel({
  inputFps,
  mode,
  onChangeSettings,
  onPickVideo,
  settings,
  videoPath,
}: Props) {
  const job = jobDefinitions.find((item) => item.id === mode) ?? jobDefinitions[0];
  const showTrimViewer = mode === "trim" && Boolean(videoPath);

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#101114]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.075] px-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">Source</h2>
        <span className="max-w-[55%] truncate text-[11px] text-white/35">
          {videoPath ? videoPath.split(/[\\/]/).pop() : "No file selected"}
        </span>
      </div>

      {showTrimViewer ? (
        <TrimViewer
          inputFps={inputFps}
          onChangeSettings={onChangeSettings}
          onPickVideo={onPickVideo}
          settings={settings}
          videoPath={videoPath}
        />
      ) : (
        <button
          className="m-4 flex min-h-0 flex-1 flex-col items-center justify-center rounded-md border border-dashed border-white/[0.12] bg-[#0b0c0e] px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors hover:border-white/25 hover:bg-[#121316]"
          onClick={onPickVideo}
          type="button"
        >
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.075] bg-white/[0.035]">
            <span className="h-7 w-9 rounded border border-white/35 bg-white/[0.06]" />
          </span>
          <span className="text-lg font-semibold">{videoPath ? job.label : "Choose video"}</span>
          <span className="mt-2 max-w-md break-all text-xs text-white/40">
            {videoPath || `${job.description} Drop a video here, or pick an MP4, MOV, MKV, AVI, or WebM file.`}
          </span>
          <span className="mt-5 rounded bg-white px-3 py-1.5 text-xs font-medium text-black shadow-sm">
            {videoPath ? "Change video" : "Browse files"}
          </span>
        </button>
      )}

      {inputFps && (
        <p className="shrink-0 border-t border-white/[0.075] px-3 py-2 text-[11px] text-white/35">
          Detected {inputFps.toFixed(2)} FPS
        </p>
      )}
    </section>
  );
}
