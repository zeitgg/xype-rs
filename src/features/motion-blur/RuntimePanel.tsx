import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { RuntimeState, ToolState } from "./types";

type Props = {
  ffmpegProgress: number;
  ffmpegPath: string;
  ffmpegState: ToolState;
  ffmpegValid: boolean | null;
  installProgress: number;
  onInstallFfmpeg: () => void;
  onInstall: () => void;
  runtimeState: RuntimeState;
};

export function RuntimePanel({
  ffmpegProgress,
  ffmpegPath,
  ffmpegState,
  ffmpegValid,
  installProgress,
  onInstallFfmpeg,
  onInstall,
  runtimeState,
}: Props) {
  const needsVideoTools = ffmpegValid !== true;
  const needsEngine = runtimeState !== "ready";
  const isWorking = ffmpegState === "installing" || runtimeState === "installing";

  return (
    <section className="flex min-h-10 shrink-0 items-center gap-3 border-b border-white/[0.075] bg-[#141518] px-3 text-[11px]">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="font-medium text-white/45">Setup</span>
        {!needsVideoTools && !needsEngine && !isWorking && (
          <span className="text-white/28">Everything needed is installed.</span>
        )}
        {ffmpegState === "installing" && <Progress className="max-w-28" value={ffmpegProgress} />}
        {needsVideoTools && (
          <Button
            disabled={ffmpegState === "installing"}
            onClick={onInstallFfmpeg}
            size="sm"
            type="button"
          >
            Install video tools
          </Button>
        )}
        {ffmpegPath && <span className="truncate text-white/24">{ffmpegPath}</span>}
      </div>

      <div className="flex items-center gap-2 border-l border-white/[0.075] pl-3">
        {runtimeState === "installing" && <Progress className="max-w-28" value={installProgress} />}
        {needsEngine && (
          <Button
            disabled={runtimeState === "installing"}
            onClick={onInstall}
            size="sm"
            type="button"
          >
            Install engine
          </Button>
        )}
      </div>
    </section>
  );
}
