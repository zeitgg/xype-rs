import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { RuntimeState, ToolState } from "./types";

type Props = {
  ffmpegPath: string;
  ffmpegProgress: number;
  ffmpegState: ToolState;
  ffmpegValid: boolean | null;
  installProgress: number;
  onInstallFfmpeg: () => void;
  onInstallRuntime: () => void;
  onOpenChange: (open: boolean) => void;
  onPickFfmpeg: () => void;
  onSetFfmpegPath: (value: string) => void;
  open: boolean;
  runtimeState: RuntimeState;
};

export function AppSettingsDialog({
  ffmpegPath,
  ffmpegProgress,
  ffmpegState,
  ffmpegValid,
  installProgress,
  onInstallFfmpeg,
  onInstallRuntime,
  onOpenChange,
  onPickFfmpeg,
  onSetFfmpegPath,
  open,
  runtimeState,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!h-[calc(100vh-3rem)] !w-[calc(100vw-3rem)] !max-w-[calc(100vw-3rem)] grid-rows-[auto_minmax(0,1fr)] border border-white/[0.075] bg-[#17181b] p-0 text-white sm:!max-w-[calc(100vw-3rem)]">
        <DialogHeader>
          <div className="border-b border-white/[0.075] px-5 py-4">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage the tools xype uses for rendering.</DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 grid-cols-[220px_minmax(0,1fr)]">
          <nav className="border-r border-white/[0.075] bg-black/10 p-3">
            <button className="w-full rounded bg-white/[0.08] px-3 py-2 text-left text-xs font-medium" type="button">
              Tools
            </button>
          </nav>

          <div className="min-h-0 space-y-3 overflow-auto p-5">
            <section className="space-y-3 rounded-md border border-white/[0.075] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Video tools</p>
                  <p className="text-xs text-white/40">
                    {ffmpegValid ? "Installed automatically." : "Required for every module."}
                  </p>
                </div>
                <Button
                  disabled={ffmpegState === "installing"}
                  onClick={onInstallFfmpeg}
                  type="button"
                >
                  {ffmpegValid ? "Reinstall" : "Install"}
                </Button>
              </div>
              {ffmpegState === "installing" && <Progress value={ffmpegProgress} />}
            </section>

            <section className="space-y-3 rounded-md border border-white/[0.075] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Blur engine</p>
                  <p className="text-xs text-white/40">Needed only for Add Blur.</p>
                </div>
                <Button
                  disabled={runtimeState === "installing"}
                  onClick={onInstallRuntime}
                  type="button"
                >
                  {runtimeState === "ready" ? "Reinstall" : "Install"}
                </Button>
              </div>
              {runtimeState === "installing" && <Progress value={installProgress} />}
            </section>

            <section className="space-y-2 rounded-md border border-white/[0.075] bg-white/[0.025] p-4">
              <p className="text-sm font-medium">Custom FFmpeg</p>
              <p className="text-xs text-white/40">
                Optional. Leave this alone unless you need your own build.
              </p>
              <div className="flex gap-2">
                <Input
                  className="border-white/[0.075] bg-white/[0.045] text-white placeholder:text-white/25"
                  onChange={(event) => onSetFfmpegPath(event.currentTarget.value)}
                  placeholder="ffmpeg.exe path"
                  spellCheck={false}
                  value={ffmpegPath}
                />
                <Button onClick={onPickFfmpeg} type="button" variant="outline">
                  Pick
                </Button>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
