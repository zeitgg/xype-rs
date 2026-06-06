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
};

export function StatusPanel({
  actionLabel = "Create Copy",
  canRender,
  modeLabel,
  onRender,
  outputPath,
  processing,
  progress,
}: Props) {
  return (
    <section className="flex h-12 shrink-0 items-center gap-3 border-t border-white/[0.075] bg-[#18191c] px-3">
      <div className="min-w-0 flex-1">
        {processing ? (
          <div className="flex max-w-sm items-center gap-3">
            <Progress value={progress} />
            <span className="w-9 text-right font-mono text-xs text-white/35">{progress}%</span>
          </div>
        ) : outputPath ? (
          <span className="truncate text-xs text-white/42">Export complete</span>
        ) : (
          <span className="truncate text-xs text-white/30">
            {canRender ? modeLabel : "Choose a video and install tools"}
          </span>
        )}
      </div>
      <Button className="h-8 w-36" disabled={!canRender} onClick={onRender} type="button">
        {processing ? "Exporting" : actionLabel}
      </Button>
    </section>
  );
}
