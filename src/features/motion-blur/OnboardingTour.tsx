import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Download04Icon,
  KeyboardIcon,
  PlayIcon,
  Settings02Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { RuntimeState, ToolState } from "./types";

type Props = {
  ffmpegProgress: number;
  ffmpegState: ToolState;
  ffmpegValid: boolean | null;
  installProgress: number;
  onClose: () => void;
  onInstallFfmpeg: () => void;
  onInstallRuntime: () => void;
  runtimeState: RuntimeState;
};

const steps = [
  {
    body: "Drop in a video or browse for one. xype always writes a new file and leaves your original untouched.",
    icon: Video01Icon,
    kind: "source",
    title: "Choose a video",
  },
  {
    body: "Pick the job from the titlebar. Use Trim for cuts, Motion Blur for smooth renders, or the upload presets for platform copies.",
    icon: Settings02Icon,
    kind: "modules",
    title: "Choose a module",
  },
  {
    body: "In Trim, press I to set an in point and O to add the out point. Repeat I/O to keep multiple segments and merge them on export.",
    icon: KeyboardIcon,
    kind: "keyboard",
    title: "Cut fast",
  },
  {
    body: "Press Export Segment or Create Copy. Progress appears in the bottom bar, and the finished file is saved beside the source video.",
    icon: PlayIcon,
    kind: "export",
    title: "Export",
  },
] as const;

export function OnboardingTour({
  ffmpegProgress,
  ffmpegState,
  ffmpegValid,
  installProgress,
  onClose,
  onInstallFfmpeg,
  onInstallRuntime,
  runtimeState,
}: Props) {
  const [phase, setPhase] = useState<"setup" | "tour">("setup");
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const setupComplete = ffmpegValid === true && runtimeState === "ready";
  const targetRect = useTargetRect(phase === "tour" ? step.kind : null);
  const highlightStyle = useMemo(() => getHighlightStyle(targetRect), [targetRect]);
  const calloutStyle = useMemo(() => getCalloutStyle(targetRect), [targetRect]);

  function finish() {
    localStorage.setItem("xype.onboardingComplete", "1");
    onClose();
  }

  if (phase === "tour") {
    return (
      <div className="pointer-events-none fixed inset-0 z-50 animate-in fade-in-0 duration-150">
        {highlightStyle && (
          <div
            className="pointer-events-none fixed rounded-md border-2 border-white bg-white/[0.04] shadow-[0_0_0_2px_rgba(255,255,255,0.28),0_0_0_9999px_rgba(0,0,0,0.24),0_0_34px_rgba(255,255,255,0.38)] transition-all duration-300"
            style={highlightStyle}
          />
        )}

        <section
          className="pointer-events-auto fixed w-[min(340px,calc(100vw-2rem))] rounded-lg border border-white/[0.14] bg-[#17181b]/95 p-4 text-white shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
          style={calloutStyle}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.05]">
                <HugeiconsIcon className="size-4" icon={step.icon} />
              </span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/30">
                  Tour {index + 1} of {steps.length}
                </p>
                <h2 className="mt-1 text-base font-semibold">{step.title}</h2>
              </div>
            </div>
            <button
              className="rounded px-2 py-1 text-[11px] text-white/45 hover:bg-white/[0.07] hover:text-white"
              onClick={finish}
              type="button"
            >
              Skip
            </button>
          </div>

          <p className="text-sm leading-5 text-white/58">{step.body}</p>

          {step.kind === "keyboard" && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              <Key label="I" value="In" />
              <Key label="O" value="Out" />
              <Key label="Space" value="Play" />
              <Key label="Arrows" value="Step" />
            </div>
          )}

          <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="mt-4 flex justify-between gap-3">
            <Button
              onClick={() => {
                if (index === 0) setPhase("setup");
                else setIndex((value) => value - 1);
              }}
              type="button"
              variant="outline"
            >
              Back
            </Button>
            <Button
              onClick={() => {
                if (isLast) finish();
                else setIndex((value) => value + 1);
              }}
              type="button"
            >
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] animate-in fade-in-0 duration-150">
      {highlightStyle && (
        <div
          className="pointer-events-none fixed rounded-md border-2 border-white bg-white/[0.055] shadow-[0_0_0_2px_rgba(255,255,255,0.22),0_0_0_9999px_rgba(0,0,0,0.48),0_0_36px_rgba(255,255,255,0.35)] transition-all duration-300"
          style={highlightStyle}
        />
      )}

      <section className="fixed left-1/2 top-1/2 grid max-h-[calc(100vh-2rem)] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/[0.12] bg-[#17181b] text-white shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 max-[720px]:grid-cols-1">
        <aside className="border-r border-white/[0.075] bg-black/15 p-4 max-[720px]:hidden">
          <div className="mb-5 flex items-center gap-2">
            <img alt="xype" className="size-6" src="/logo.png" />
            <div>
              <p className="text-sm font-semibold">Welcome to xype</p>
              <p className="text-[11px] text-white/35">Tool setup</p>
            </div>
          </div>
          <div className="space-y-1">
            <button
              className={[
                "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs transition-colors",
                "bg-white/[0.09] text-white",
              ].join(" ")}
              onClick={() => setPhase("setup")}
              type="button"
            >
              <span className="flex size-5 items-center justify-center rounded bg-white/[0.07]">
                {setupComplete ? <HugeiconsIcon className="size-3.5" icon={CheckmarkCircle02Icon} /> : 1}
              </span>
              Install tools
            </button>
            {steps.map((item, itemIndex) => (
              <button
                className={[
                  "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs transition-colors",
                  "text-white/42 hover:bg-white/[0.045] hover:text-white/75",
                ].join(" ")}
                key={item.title}
                onClick={() => {
                  setIndex(itemIndex);
                  setPhase("tour");
                }}
                type="button"
              >
                <span className="flex size-5 items-center justify-center rounded bg-white/[0.07]">
                  {itemIndex + 2}
                </span>
                {item.title}
              </button>
            ))}
          </div>
        </aside>

        <div className="overflow-y-auto p-5">
          {phase === "setup" ? (
            <>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.05]">
                    <HugeiconsIcon className="size-5" icon={Download04Icon} />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/30">First launch</p>
                    <h2 className="mt-1 text-lg font-semibold">Install the tools xype needs</h2>
                  </div>
                </div>
                <button
                  className="rounded px-2 py-1 text-[11px] text-white/45 hover:bg-white/[0.07] hover:text-white"
                  onClick={finish}
                  type="button"
                >
                  Skip
                </button>
              </div>

              <p className="max-w-xl text-sm leading-6 text-white/55">
                xype can download its video tools for you. Install them now so exports work without extra setup.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                <ToolSetupCard
                  actionLabel={ffmpegValid ? "Installed" : "Install"}
                  disabled={ffmpegValid === true || ffmpegState === "installing"}
                  label="Video tools"
                  onAction={onInstallFfmpeg}
                  progress={ffmpegState === "installing" ? ffmpegProgress : null}
                  status={ffmpegValid ? "Installed for exporting" : "Needed for every export"}
                />
                <ToolSetupCard
                  actionLabel={runtimeState === "ready" ? "Installed" : "Install"}
                  disabled={runtimeState === "ready" || runtimeState === "installing"}
                  label="Motion blur engine"
                  onAction={onInstallRuntime}
                  progress={runtimeState === "installing" ? installProgress : null}
                  status={runtimeState === "ready" ? "Installed for blur renders" : "Needed for Motion Blur"}
                />
              </div>

              <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: setupComplete ? "100%" : "18%" }}
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                {!setupComplete && (
                  <Button onClick={() => setPhase("tour")} type="button" variant="outline">
                    Tour without installing
                  </Button>
                )}
                <Button onClick={() => setPhase("tour")} type="button">
                  {setupComplete ? "Start tour" : "Continue to tour"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.05]">
                    <HugeiconsIcon className="size-5" icon={step.icon} />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/30">
                      Tour {index + 1} of {steps.length}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
                  </div>
                </div>
                <button
                  className="rounded px-2 py-1 text-[11px] text-white/45 hover:bg-white/[0.07] hover:text-white"
                  onClick={finish}
                  type="button"
                >
                  Skip
                </button>
              </div>

              <p className="max-w-xl text-sm leading-6 text-white/55">{step.body}</p>

              {step.kind === "keyboard" && (
                <div className="mt-5 grid grid-cols-4 gap-2 max-[640px]:grid-cols-2">
                  <Key label="I" value="Set in" />
                  <Key label="O" value="Set out" />
                  <Key label="Space" value="Play" />
                  <Key label="Arrows" value="Step" />
                </div>
              )}

              <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${((index + 1) / steps.length) * 100}%` }}
                />
              </div>

              <div className="mt-5 flex justify-between gap-3">
                <Button
                  onClick={() => {
                    if (index === 0) setPhase("setup");
                    else setIndex((value) => value - 1);
                  }}
                  type="button"
                  variant="outline"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (isLast) finish();
                    else setIndex((value) => value + 1);
                  }}
                  type="button"
                >
                  {isLast ? "Start using xype" : "Next"}
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

type ToolSetupCardProps = {
  actionLabel: string;
  disabled: boolean;
  label: string;
  onAction: () => void;
  progress: number | null;
  status: string;
};

function ToolSetupCard({ actionLabel, disabled, label, onAction, progress, status }: ToolSetupCardProps) {
  return (
    <div className="rounded-md border border-white/[0.075] bg-white/[0.025] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-xs text-white/38">{status}</p>
        </div>
        <Button disabled={disabled} onClick={onAction} size="sm" type="button" variant="outline">
          {actionLabel}
        </Button>
      </div>
      {progress != null && <Progress className="mt-3" value={progress} />}
    </div>
  );
}

function Key({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.075] bg-white/[0.025] p-3 text-center">
      <p className="font-mono text-sm text-white/80">{label}</p>
      <p className="mt-1 text-[11px] text-white/35">{value}</p>
    </div>
  );
}

function useTargetRect(kind: string | null) {
  const target = kind ? getTarget(kind) : null;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    function updateRect() {
      if (!target) {
        setRect(null);
        return;
      }

      setRect(document.querySelector(`[data-tour="${target}"]`)?.getBoundingClientRect() ?? null);
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [target]);

  return rect;
}

function getTarget(kind: string) {
  if (kind === "tools") return "settings";
  if (kind === "source") return "source";
  if (kind === "modules") return "modules";
  if (kind === "keyboard") return "properties";
  return "export";
}

function getHighlightStyle(rect: DOMRect | null) {
  if (!rect) return null;
  return {
    height: rect.height + 8,
    left: rect.left - 4,
    top: rect.top - 4,
    width: rect.width + 8,
  };
}

function getCalloutStyle(rect: DOMRect | null) {
  const width = Math.min(340, window.innerWidth - 32);

  if (!rect) {
    return {
      left: Math.max(16, (window.innerWidth - width) / 2),
      top: Math.max(16, window.innerHeight - 220),
      width,
    };
  }

  const rightSideFits = rect.right + width + 20 < window.innerWidth;
  const leftSideFits = rect.left - width - 20 > 0;
  const left = rightSideFits
    ? rect.right + 12
    : leftSideFits
      ? rect.left - width - 12
      : Math.max(16, Math.min(window.innerWidth - width - 16, rect.left));
  const top = Math.max(16, Math.min(window.innerHeight - 260, rect.top));

  return {
    left,
    top,
    width,
  };
}
