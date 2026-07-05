import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Props = {
  actionLabel?: string;
  canRender: boolean;
  disabledReason: string;
  modeLabel: string;
  onRender: () => void;
  outputPath: string | null;
  processing: boolean;
  progress: number;
};

export function StatusPanel({
  actionLabel = "Create Copy",
  canRender,
  disabledReason,
  modeLabel,
  onRender,
  outputPath,
  processing,
  progress,
}: Props) {
  return (
    <section className="flex h-11 shrink-0 items-center gap-3 px-3">
      <div className="min-w-0 flex-1">
        {processing ? (
          <div className="flex max-w-sm items-center gap-3">
            <Progress value={progress} />
            <span className="w-9 text-right font-mono text-xs text-muted-foreground">{progress}%</span>
          </div>
        ) : outputPath ? (
          <span className="rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-foreground">
            Export complete
          </span>
        ) : (
          <span className="truncate text-xs font-medium text-muted-foreground">
            {canRender ? modeLabel : disabledReason}
          </span>
        )}
      </div>
      <Button className="h-8 w-36 font-medium" disabled={!canRender} onClick={onRender} type="button">
        {processing ? "Exporting" : actionLabel}
      </Button>
    </section>
  );
}
