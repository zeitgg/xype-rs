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
  const context = sourceContext[mode];

  return (
    <section className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/70 px-3">
        <h2 className="text-sm font-semibold text-foreground">Viewer</h2>
        <span className="max-w-[55%] truncate text-xs font-medium text-muted-foreground">
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
          className="m-3 flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-border/70 bg-muted/25 px-5 text-center transition-colors hover:bg-muted/45"
          onClick={onPickVideo}
          type="button"
        >
          <span className="mb-3 flex size-12 items-center justify-center rounded-lg border border-border/70 bg-background/70">
            <span className="h-6 w-8 rounded border border-foreground/35 bg-foreground/[0.06]" />
          </span>
          <span className="text-base font-semibold">{videoPath ? job.label : context.title}</span>
          <span className="mt-1.5 max-w-md break-all text-xs leading-5 text-muted-foreground">
            {videoPath || context.description}
          </span>
          {!videoPath && (
            <span className="mt-3 grid w-full max-w-lg grid-cols-3 gap-1.5">
              {context.steps.map((step) => (
                <span
                className="rounded-md border border-border/60 bg-background/55 px-2.5 py-2 text-left"
                  key={step.label}
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {step.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-foreground/80">{step.value}</span>
                </span>
              ))}
            </span>
          )}
          <span className="mt-4 rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-xs">
            {videoPath ? "Change video" : "Browse files"}
          </span>
        </button>
      )}

      {inputFps && (
        <p className="shrink-0 border-t border-border/70 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          Detected {inputFps.toFixed(2)} FPS
        </p>
      )}
    </section>
  );
}

const sourceContext: Record<JobMode, { title: string; description: string; steps: Array<{ label: string; value: string }> }> = {
  motion: {
    title: "Open a clip for Motion Blur",
    description: "Drop or browse a video, then choose a look in Adjustments.",
    steps: [
      { label: "Input", value: "Video" },
      { label: "Look", value: "Preset" },
      { label: "Output", value: "Copy" },
    ],
  },
  trim: {
    title: "Open a clip to trim",
    description: "Load a video to reveal the visual timeline and segment list.",
    steps: [
      { label: "Mark", value: "I / O" },
      { label: "Review", value: "Segments" },
      { label: "Output", value: "Cut" },
    ],
  },
  compress: {
    title: "Open a clip to compress",
    description: "Load a video, then pick the size and quality target.",
    steps: [
      { label: "Goal", value: "Quality" },
      { label: "Size", value: "Limit" },
      { label: "Output", value: "MP4" },
    ],
  },
  discord: {
    title: "Open a clip for Discord",
    description: "Creates a small copy for Discord upload limits.",
    steps: [
      { label: "Target", value: "8 MB" },
      { label: "Format", value: "MP4" },
      { label: "Output", value: "Copy" },
    ],
  },
  youtube: {
    title: "Open a clip for YouTube",
    description: "Creates a 2160p upload copy with practical defaults.",
    steps: [
      { label: "Size", value: "4K" },
      { label: "Format", value: "MP4" },
      { label: "Output", value: "Copy" },
    ],
  },
  tiktok: {
    title: "Open a clip for TikTok",
    description: "Applies the 1:1 quality patch for uploads.",
    steps: [
      { label: "Method", value: "Patch" },
      { label: "Codec", value: "H.264" },
      { label: "Output", value: "Copy" },
    ],
  },
};
