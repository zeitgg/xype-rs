import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/button";
import type { AccessCheck, PublicAuthSession } from "./account";

type Props = {
  access: AccessCheck | null;
  checking: boolean;
  onRetry: () => void;
  session: PublicAuthSession | null;
};

export function SubscriptionGate({ access, checking, onRetry, session }: Props) {
  const message = access?.error ?? "Log in with an active subscription to use xype.";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1012] p-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.09),transparent_34%)]" />
      <section className="relative w-full max-w-[420px] rounded-lg border border-white/[0.09] bg-[#17181b]/95 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <img alt="xype" className="size-9" src="/logo.png" />
          <div>
            <p className="text-base font-semibold">xype</p>
            <p className="text-xs text-white/38">Subscription required</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <h1 className="text-xl font-semibold">Sign in to continue</h1>
          <p className="text-sm leading-6 text-white/50">
            xype is locked until your account and subscription are verified.
          </p>
        </div>

        <div className="mt-5 rounded-md border border-white/[0.075] bg-white/[0.025] p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">Status</p>
          <p className="mt-1 text-sm text-white/70">
            {checking ? "Checking account..." : session ? session.email : "Not signed in"}
          </p>
          {!checking && <p className="mt-1 text-xs text-white/38">{message}</p>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              void openUrl("https://xype.gg/login");
            }}
            type="button"
          >
            Log in
          </Button>
          <Button disabled={checking} onClick={onRetry} type="button" variant="outline">
            {checking ? "Checking" : "Retry"}
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] text-white/28">
          After login, return here and xype will unlock automatically.
        </p>
      </section>
    </div>
  );
}
