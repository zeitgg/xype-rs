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
import { useState } from "react";

export type UpdateState = {
  currentVersion: string;
  lastChecked: string | null;
  message: string;
  progress: number;
  status: "idle" | "checking" | "available" | "downloading" | "latest" | "error";
  updateVersion: string | null;
};

type Props = {
  ffmpegPath: string;
  ffmpegProgress: number;
  ffmpegState: ToolState;
  ffmpegValid: boolean | null;
  installProgress: number;
  onCheckForUpdates: () => void;
  onInstallFfmpeg: () => void;
  onInstallRuntime: () => void;
  onOpenChange: (open: boolean) => void;
  onPickFfmpeg: () => void;
  onSetFfmpegPath: (value: string) => void;
  open: boolean;
  runtimeState: RuntimeState;
  updateState: UpdateState;
};

type SettingsTab = "tools" | "updates";

export function AppSettingsDialog({
  ffmpegPath,
  ffmpegProgress,
  ffmpegState,
  ffmpegValid,
  installProgress,
  onCheckForUpdates,
  onInstallFfmpeg,
  onInstallRuntime,
  onOpenChange,
  onPickFfmpeg,
  onSetFfmpegPath,
  open,
  runtimeState,
  updateState,
}: Props) {
  const [tab, setTab] = useState<SettingsTab>("tools");

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
          <nav className="space-y-1 border-r border-white/[0.075] bg-black/10 p-3">
            <TabButton active={tab === "tools"} onClick={() => setTab("tools")}>
              Tools
            </TabButton>
            <TabButton active={tab === "updates"} onClick={() => setTab("updates")}>
              Updates
            </TabButton>
          </nav>

          <div className="min-h-0 space-y-3 overflow-auto p-5">
            {tab === "tools" ? (
              <>
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
                      <p className="text-xs text-white/40">Needed only for Motion Blur.</p>
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
              </>
            ) : (
              <UpdatesPanel onCheckForUpdates={onCheckForUpdates} updateState={updateState} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type UpdatesPanelProps = {
  onCheckForUpdates: () => void;
  updateState: UpdateState;
};

function UpdatesPanel({ onCheckForUpdates, updateState }: UpdatesPanelProps) {
  const busy = updateState.status === "checking" || updateState.status === "downloading";

  return (
    <div className="space-y-3">
      <section className="rounded-md border border-white/[0.075] bg-white/[0.025] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">App updates</p>
            <p className="mt-1 text-xs text-white/40">
              xype checks signed GitHub Releases and installs updates in place.
            </p>
          </div>
          <Button disabled={busy} onClick={onCheckForUpdates} type="button" variant="outline">
            {updateState.status === "checking" ? "Checking" : "Check for updates"}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <UpdateMetric label="Current version" value={formatVersion(updateState.currentVersion)} />
          <UpdateMetric label="Latest found" value={formatVersion(updateState.updateVersion)} />
          <UpdateMetric label="Last checked" value={updateState.lastChecked ?? "Never"} />
        </div>
      </section>

      <section className="rounded-md border border-white/[0.075] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{statusLabel(updateState)}</p>
            <p className="mt-1 text-xs text-white/40">{updateState.message}</p>
          </div>
          <span className="rounded bg-white/[0.07] px-2 py-1 text-[11px] text-white/50">
            {updateState.status}
          </span>
        </div>
        {updateState.status === "downloading" && (
          <Progress className="mt-4" value={updateState.progress} />
        )}
      </section>
    </div>
  );
}

type UpdateMetricProps = {
  label: string;
  value: string;
};

function UpdateMetric({ label, value }: UpdateMetricProps) {
  return (
    <div className="rounded border border-white/[0.06] bg-black/15 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-white/70">{value}</p>
    </div>
  );
}

function statusLabel(updateState: UpdateState) {
  if (updateState.status === "checking") return "Checking for updates";
  if (updateState.status === "available") return "Update available";
  if (updateState.status === "downloading") return "Installing update";
  if (updateState.status === "latest") return "Up to date";
  if (updateState.status === "error") return "Update check failed";
  return "Automatic updates";
}

function formatVersion(version: string | null) {
  if (!version) return "None";
  return version.startsWith("v") ? version : `v${version}`;
}

type TabButtonProps = {
  active: boolean;
  children: string;
  onClick: () => void;
};

function TabButton({ active, children, onClick }: TabButtonProps) {
  return (
    <button
      className={[
        "w-full rounded px-3 py-2 text-left text-xs font-medium transition-colors",
        active ? "bg-white/[0.08] text-white" : "text-white/45 hover:bg-white/[0.045] hover:text-white/75",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
