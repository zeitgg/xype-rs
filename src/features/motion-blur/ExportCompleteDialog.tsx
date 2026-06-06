import { revealItemInDir } from "@tauri-apps/plugin-opener";
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
  outputPath: string | null;
};

export function ExportCompleteDialog({ onOpenChange, open, outputPath }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/[0.09] bg-[#17181b] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export complete</DialogTitle>
          <DialogDescription>Your new video is ready.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-white/[0.075] bg-white/[0.025] p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Saved file</p>
          <p className="mt-1 break-all text-xs text-white/65">{outputPath}</p>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
          <Button
            disabled={!outputPath}
            onClick={() => {
              if (outputPath) void revealItemInDir(outputPath);
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
