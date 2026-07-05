import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { UpdateState } from "./AppSettingsDialog";

type Props = {
  onDismiss: () => void;
  onInstall: () => void;
  onOpenSettings: () => void;
  updateState: UpdateState;
};

export function UpdateAvailableToast({ onDismiss, onInstall, onOpenSettings, updateState }: Props) {
  if (updateState.status !== "available" && updateState.status !== "downloading") return null;

  const installing = updateState.status === "downloading";
  const version = updateState.updateVersion ? `v${updateState.updateVersion.replace(/^v/i, "")}` : "a new version";

  return (
    <section className="fixed bottom-16 left-4 z-50 w-[min(340px,calc(100vw-2rem))] rounded-lg border border-border bg-card p-3 text-foreground shadow-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{installing ? "Installing update" : "Update available"}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {installing ? updateState.message : `${version} is ready to install.`}
          </p>
        </div>
        {!installing && (
          <button
            aria-label="Dismiss update notification"
            className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onDismiss}
            type="button"
          >
            Dismiss
          </button>
        )}
      </div>

      {installing ? (
        <Progress className="mt-3" value={updateState.progress} />
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={onInstall} type="button">
            Install
          </Button>
          <Button onClick={onOpenSettings} type="button" variant="outline">
            Details
          </Button>
        </div>
      )}
    </section>
  );
}
