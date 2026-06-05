import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Props = {
  actionLabel?: string;
  canRender: boolean;
  modeLabel: string;
  onRender: () => void;
  outputPath: string | null;
  processing: boolean;
  progress: number;
  status: string;
};

export function StatusPanel({
  actionLabel = "Create Copy",
  canRender,
  modeLabel,
  onRender,
  outputPath,
  processing,
  progress,
  status,
}: Props) {
  return (
    <section className="flex min-h-14 shrink-0 items-center gap-3 border-t border-white/[0.075] bg-[#18191c] px-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-xs font-medium text-white/55">{modeLabel}</span>
          {processing ? (
            <>
              <Progress className="max-w-sm" value={progress} />
              <span className="text-xs text-white/35">{progress}%</span>
            </>
          ) : outputPath ? (
            <span className="truncate text-xs text-white/45">Saved to: {outputPath}</span>
          ) : (
            <span className="text-xs text-white/30">
              {canRender ? "Ready when you are." : "Choose a video and install the needed tools."}
            </span>
          )}
        </div>
        {status && !processing && <p className="truncate text-[11px] text-white/28">{status}</p>}
      </div>
      <Button className="h-8 w-36" disabled={!canRender} onClick={onRender} type="button">
        {processing ? "Working" : actionLabel}
      </Button>
    </section>
  );
}
