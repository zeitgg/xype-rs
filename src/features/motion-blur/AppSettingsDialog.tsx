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
import type { AccessCheck, PublicAuthSession } from "./account";

export type UpdateState = {
  currentVersion: string;
  lastChecked: string | null;
  message: string;
  progress: number;
  status: "idle" | "checking" | "available" | "downloading" | "latest" | "error";
  updateVersion: string | null;
};

type Props = {
  access: AccessCheck | null;
  accountChecking: boolean;
  ffmpegPath: string;
  ffmpegProgress: number;
  ffmpegState: ToolState;
  ffmpegValid: boolean | null;
  installProgress: number;
  onCheckForUpdates: () => void;
  onInstallFfmpeg: () => void;
  onInstallRuntime: () => void;
  onInstallUpdate: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenChange: (open: boolean) => void;
  onPickFfmpeg: () => void;
  onRefreshAccount: () => void;
  onSetFfmpegPath: (value: string) => void;
  onShowOnboarding: () => void;
  open: boolean;
  runtimeState: RuntimeState;
  session: PublicAuthSession | null;
  updateState: UpdateState;
};

type SettingsTab = "tools" | "account" | "updates";

export function AppSettingsDialog({
  access,
  accountChecking,
  ffmpegPath,
  ffmpegProgress,
  ffmpegState,
  ffmpegValid,
  installProgress,
  onCheckForUpdates,
  onInstallFfmpeg,
  onInstallRuntime,
  onInstallUpdate,
  onLogin,
  onLogout,
  onOpenChange,
  onPickFfmpeg,
  onRefreshAccount,
  onSetFfmpegPath,
  onShowOnboarding,
  open,
  runtimeState,
  session,
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
            <TabButton active={tab === "account"} onClick={() => setTab("account")}>
              Account
            </TabButton>
            <TabButton active={tab === "updates"} onClick={() => setTab("updates")}>
              Updates
            </TabButton>
          </nav>

          <div className="xype-scrollbar min-h-0 space-y-3 overflow-auto p-5">
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

                <section className="flex items-center justify-between gap-3 rounded-md border border-white/[0.075] bg-white/[0.025] p-4">
                  <div>
                    <p className="text-sm font-medium">Tutorial</p>
                    <p className="text-xs text-white/40">Replay the quick app walkthrough.</p>
                  </div>
                  <Button onClick={onShowOnboarding} type="button" variant="outline">
                    Show tutorial
                  </Button>
                </section>
              </>
            ) : tab === "account" ? (
              <AccountPanel
                access={access}
                checking={accountChecking}
                onLogin={onLogin}
                onLogout={onLogout}
                onRefresh={onRefreshAccount}
                session={session}
              />
            ) : (
              <UpdatesPanel
                onCheckForUpdates={onCheckForUpdates}
                onInstallUpdate={onInstallUpdate}
                updateState={updateState}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type UpdatesPanelProps = {
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
  updateState: UpdateState;
};

function UpdatesPanel({ onCheckForUpdates, onInstallUpdate, updateState }: UpdatesPanelProps) {
  const busy = updateState.status === "checking" || updateState.status === "downloading";
  const canInstall = updateState.status === "available" && updateState.updateVersion;

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

      <section className={`${statusShell(updateState.status)} rounded-md border p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`${statusDot(updateState.status)} size-2 rounded-full`} />
              <p className="text-sm font-medium">{statusLabel(updateState)}</p>
            </div>
            <p className="mt-1 text-xs text-white/48">{updateState.message}</p>
          </div>
          <StatusBadge status={updateState.status} />
        </div>

        {(updateState.status === "checking" || updateState.status === "downloading") && (
          <Progress className="mt-4" value={updateState.progress} />
        )}

        {canInstall && (
          <div className="mt-4 flex justify-end">
            <Button onClick={onInstallUpdate} type="button">
              Install update
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

type AccountPanelProps = {
  access: AccessCheck | null;
  checking: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  session: PublicAuthSession | null;
};

function AccountPanel({ access, checking, onLogin, onLogout, onRefresh, session }: AccountPanelProps) {
  const active = Boolean(access?.access);

  return (
    <div className="space-y-3">
      <section className="rounded-md border border-white/[0.075] bg-white/[0.025] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Account</p>
            <p className="mt-1 text-xs text-white/40">Sign in to verify your xype subscription.</p>
          </div>
          <span
            className={[
              "rounded px-2 py-1 text-[11px]",
              active ? "bg-emerald-400/[0.12] text-emerald-200" : "bg-white/[0.07] text-white/55",
            ].join(" ")}
          >
            {active ? "Active" : checking ? "Checking" : "Locked"}
          </span>
        </div>

        <div className="mt-4 rounded border border-white/[0.06] bg-black/15 p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Signed in as</p>
          <p className="mt-1 truncate text-sm font-medium text-white/70">{session?.email ?? "Not signed in"}</p>
          <p className="mt-1 text-xs text-white/35">
            {active
              ? "Your subscription is active."
              : access?.error ?? "Log in, then refresh to unlock xype."}
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {session ? (
            <Button onClick={onLogout} type="button" variant="outline">
              Log out
            </Button>
          ) : (
            <Button onClick={onLogin} type="button">
              Log in
            </Button>
          )}
          <Button disabled={checking} onClick={onRefresh} type="button" variant="outline">
            {checking ? "Checking" : "Refresh"}
          </Button>
        </div>
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

function statusShell(status: UpdateState["status"]) {
  if (status === "available") return "border-emerald-400/25 bg-emerald-400/[0.055]";
  if (status === "latest") return "border-white/[0.09] bg-white/[0.035]";
  if (status === "checking" || status === "downloading") return "border-sky-300/20 bg-sky-300/[0.045]";
  if (status === "error") return "border-red-400/25 bg-red-400/[0.055]";
  return "border-white/[0.075] bg-white/[0.025]";
}

function statusDot(status: UpdateState["status"]) {
  if (status === "available") return "bg-emerald-300";
  if (status === "latest") return "bg-white/65";
  if (status === "checking" || status === "downloading") return "bg-sky-300";
  if (status === "error") return "bg-red-300";
  return "bg-white/30";
}

function StatusBadge({ status }: { status: UpdateState["status"] }) {
  return (
    <span className="shrink-0 rounded bg-white/[0.07] px-2 py-1 text-[11px] text-white/55">
      {statusText(status)}
    </span>
  );
}

function statusText(status: UpdateState["status"]) {
  if (status === "available") return "Update required";
  if (status === "latest") return "Up to date";
  if (status === "checking") return "Checking";
  if (status === "downloading") return "Installing";
  if (status === "error") return "Failed";
  return "Idle";
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
