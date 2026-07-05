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
const settingsCopy: Record<SettingsTab, { description: string; title: string }> = {
  tools: {
    description: "Install and verify the render tools xype depends on.",
    title: "Tools",
  },
  account: {
    description: "Subscription and sign-in state for this device.",
    title: "Account",
  },
  updates: {
    description: "Check signed releases and install app updates.",
    title: "Updates",
  },
};

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
      <DialogContent className="!h-[calc(100vh-2rem)] !w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[22px] border border-[var(--xype-border)] bg-[var(--xype-sheet)] p-0 text-white shadow-[0_20px_54px_rgba(0,0,0,0.42)] sm:!max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <div className="border-b border-[var(--xype-border-subtle)] px-4 py-3">
            <DialogTitle className="text-base font-bold">Settings</DialogTitle>
            <DialogDescription className="text-white/45">{settingsCopy[tab].description}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 grid-cols-[220px_minmax(0,1fr)] bg-[var(--xype-sheet)]">
          <nav className="space-y-1.5 border-r border-[var(--xype-border-subtle)] p-3">
            <TabButton
              active={tab === "tools"}
              detail={toolsReady(ffmpegValid, runtimeState) ? "Installed" : "Needs setup"}
              onClick={() => setTab("tools")}
            >
              Tools
            </TabButton>
            <TabButton
              active={tab === "account"}
              detail={access?.access ? "Active" : accountChecking ? "Checking" : "Locked"}
              onClick={() => setTab("account")}
            >
              Account
            </TabButton>
            <TabButton
              active={tab === "updates"}
              detail={statusText(updateState.status)}
              onClick={() => setTab("updates")}
            >
              Updates
            </TabButton>
          </nav>

          <div className="xype-scrollbar min-h-0 space-y-3 overflow-auto p-3">
            <SettingsPageHeader tab={tab} />
            {tab === "tools" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <ToolStatusCard
                    actionLabel={ffmpegValid ? "Reinstall" : "Install"}
                    description={ffmpegValid ? "Ready for exports." : "Required for most exports."}
                    disabled={ffmpegState === "installing"}
                    progress={ffmpegProgress}
                    state={ffmpegState}
                    status={ffmpegValid ? "Ready" : toolStateLabel(ffmpegState)}
                    title="Video tools"
                    onAction={onInstallFfmpeg}
                  />
                  <ToolStatusCard
                    actionLabel={runtimeState === "ready" ? "Reinstall" : "Install"}
                    description="Required for Motion Blur."
                    disabled={runtimeState === "installing"}
                    progress={installProgress}
                    state={runtimeState}
                    status={toolStateLabel(runtimeState)}
                    title="Blur engine"
                    onAction={onInstallRuntime}
                  />
                </div>

                <section className="space-y-2 rounded-[18px] bg-[var(--xype-card)] p-3">
                  <p className="text-sm font-bold">Custom FFmpeg</p>
                  <p className="text-xs text-white/45">
                    Optional. Leave this alone unless you need your own build.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      className="border-[var(--xype-border)] bg-[var(--xype-subtle)] text-white placeholder:text-white/25"
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

                <section className="flex items-center justify-between gap-3 rounded-[18px] bg-[var(--xype-card)] p-3">
                  <div>
                    <p className="text-sm font-bold">Tutorial</p>
                    <p className="text-xs text-white/45">Replay the quick app walkthrough.</p>
                  </div>
                  <Button onClick={onShowOnboarding} type="button" variant="outline">
                    Show tutorial
                  </Button>
                </section>
              </div>
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

function SettingsPageHeader({ tab }: { tab: SettingsTab }) {
  const copy = settingsCopy[tab];

  return (
    <section className="rounded-[18px] bg-[var(--xype-card)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-white/38">Settings</p>
      <h3 className="mt-1 text-base font-bold text-white">{copy.title}</h3>
      <p className="mt-1 text-xs leading-5 text-white/48">{copy.description}</p>
    </section>
  );
}

function ToolStatusCard({
  actionLabel,
  description,
  disabled,
  onAction,
  progress,
  state,
  status,
  title,
}: {
  actionLabel: string;
  description: string;
  disabled: boolean;
  onAction: () => void;
  progress: number;
  state: ToolState;
  status: string;
  title: string;
}) {
  const busy = state === "checking" || state === "installing";

  return (
    <section className="flex min-h-36 flex-col justify-between rounded-[18px] bg-[var(--xype-card)] p-3">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-white/45">{description}</p>
          </div>
          <StateBadge state={state}>{status}</StateBadge>
        </div>
        {busy && <Progress className="mt-4" value={state === "checking" ? 35 : progress} />}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="truncate text-xs text-white/38">{busy ? "Working..." : status}</p>
        <Button disabled={disabled || state === "checking"} onClick={onAction} type="button">
          {state === "installing" ? "Installing" : actionLabel}
        </Button>
      </div>
    </section>
  );
}

function StateBadge({ children, state }: { children: string; state: ToolState }) {
  const tone =
    state === "ready"
      ? "bg-emerald-400/[0.12] text-emerald-200"
      : state === "error"
        ? "bg-red-400/[0.12] text-red-200"
        : state === "checking" || state === "installing"
          ? "bg-sky-400/[0.12] text-sky-200"
          : "bg-[var(--xype-subtle-strong)] text-white/60";

  return <span className={`${tone} shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold`}>{children}</span>;
}

function UpdatesPanel({ onCheckForUpdates, onInstallUpdate, updateState }: UpdatesPanelProps) {
  const busy = updateState.status === "checking" || updateState.status === "downloading";
  const canInstall = updateState.status === "available" && updateState.updateVersion;

  return (
    <div className="space-y-3">
      <section className="rounded-[18px] bg-[var(--xype-card)] p-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold">App updates</p>
            <p className="mt-1 text-xs text-white/45">
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

      <section className={`${statusShell(updateState.status)} rounded-[18px] border p-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`${statusDot(updateState.status)} size-2 rounded-full`} />
              <p className="text-sm font-medium">{statusLabel(updateState)}</p>
            </div>
            <p className="mt-1 text-xs text-white/50">{updateState.message}</p>
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
      <section className="rounded-[18px] bg-[var(--xype-card)] p-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold">Account</p>
            <p className="mt-1 text-xs text-white/45">Sign in to verify your xype subscription.</p>
          </div>
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[11px] font-bold",
              active ? "bg-emerald-400/[0.12] text-emerald-200" : "bg-[var(--xype-subtle-strong)] text-white/60",
            ].join(" ")}
          >
            {active ? "Active" : checking ? "Checking" : "Locked"}
          </span>
        </div>

        <div className="mt-4 rounded-[18px] border border-[var(--xype-border-subtle)] bg-[var(--xype-subtle)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/35">Signed in as</p>
          <p className="mt-1 truncate text-sm font-bold text-white/78">{session?.email ?? "Not signed in"}</p>
          <p className="mt-1 text-xs text-white/42">
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
    <div className="rounded-[18px] border border-[var(--xype-border-subtle)] bg-[var(--xype-subtle)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/35">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-white/75">{value}</p>
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
  return "border-[var(--xype-border)] bg-[var(--xype-card)]";
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
    <span className="shrink-0 rounded-full bg-[var(--xype-subtle-strong)] px-2.5 py-1 text-[11px] font-bold text-white/60">
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
  detail: string;
  onClick: () => void;
};

function TabButton({ active, children, detail, onClick }: TabButtonProps) {
  return (
    <button
      className={[
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-border bg-card text-foreground shadow-xs"
          : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <span className="block text-xs font-semibold">{children}</span>
      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
        {detail}
      </span>
    </button>
  );
}

function toolStateLabel(state: ToolState) {
  if (state === "ready") return "Ready";
  if (state === "checking") return "Checking";
  if (state === "installing") return "Installing";
  if (state === "error") return "Needs attention";
  return "Not installed";
}

function toolsReady(ffmpegValid: boolean | null, runtimeState: RuntimeState) {
  return ffmpegValid === true && runtimeState === "ready";
}
