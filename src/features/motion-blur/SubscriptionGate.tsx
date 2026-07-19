import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/button";
import type { AccessCheck, PublicAuthSession } from "./account";
import { EndOfSupportNotice } from "./EndOfSupportNotice";

type Props = {
  access: AccessCheck | null;
  checking: boolean;
  onRetry: () => void;
  session: PublicAuthSession | null;
};

export function SubscriptionGate({ access, checking, onRetry, session }: Props) {
  const message = access?.error ?? "Log in with an active subscription to use xype.";
  const locked = !checking;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background p-6 text-foreground">
      <div className="xype-splash-sheen" />
      <div className="xype-splash-grid" />
      <div className="absolute inset-x-0 top-0 z-10">
        <EndOfSupportNotice />
      </div>

      <section className="relative flex w-full max-w-[520px] flex-col items-center text-center">
        <div className="xype-splash-mark">
          <img alt="xype" className="size-16 rounded-xl" src="/logo.png" />
          <span className="xype-splash-ring" />
          <span className="xype-splash-ring xype-splash-ring-delayed" />
        </div>

        <div className="mt-7 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">xype</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {checking ? "Starting workspace" : "Workspace locked"}
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
            {checking
              ? "Checking your account and preparing the editor."
              : session
                ? `${session.email} needs an active subscription.`
                : message}
          </p>
        </div>

        <div className="mt-8 w-full max-w-72">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <span className={checking ? "xype-splash-loader" : "block h-full w-full bg-destructive/70"} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {checking ? "Verifying access" : "Sign in on xype.gg, then retry here."}
          </p>
        </div>

        {locked && (
          <div className="mt-7 grid w-full max-w-72 grid-cols-2 gap-2">
            <Button
              onClick={() => {
                void openUrl("https://xype.gg/login");
              }}
              type="button"
            >
              Open login
            </Button>
            <Button onClick={onRetry} type="button" variant="outline">
              Retry
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
