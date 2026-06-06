import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  outputPaths: string[];
};

export function ExportCompleteDialog({ onOpenChange, open, outputPaths }: Props) {
  const firstOutput = outputPaths[0] ?? null;
  const hasOutputs = outputPaths.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/[0.09] bg-[#17181b] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export complete</DialogTitle>
          <DialogDescription>
            {outputPaths.length > 1
              ? `${outputPaths.length} videos are ready.`
              : "Your new video is ready."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-white/[0.075] bg-white/[0.025] p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">
            {outputPaths.length > 1 ? "Saved files" : "Saved file"}
          </p>
          {hasOutputs ? (
            <div className="xype-scrollbar mt-2 max-h-40 space-y-2 overflow-auto">
              {outputPaths.map((path) => (
                <div className="min-w-0 rounded bg-black/15 px-2 py-2" key={path}>
                  <p className="truncate text-xs font-medium text-white/80">{fileName(path)}</p>
                  <p className="mt-0.5 break-all text-[11px] text-white/42">{path}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-white/45">No output path was returned.</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
          <Button
            disabled={!firstOutput}
            onClick={() => {
              if (firstOutput) void openPath(firstOutput);
            }}
            type="button"
            variant="outline"
          >
            Open video
          </Button>
          <Button
            disabled={!hasOutputs}
            onClick={() => {
              if (hasOutputs) void revealItemInDir(outputPaths);
            }}
            type="button"
          >
            Open location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fileName(path: string) {
  return path.slice(Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/")) + 1) || path;
}
