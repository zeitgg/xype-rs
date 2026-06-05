import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  onClose: () => void;
};

const steps = [
  {
    body: "Start here. Pick a video, then choose what you want xype to do with it.",
    target: "source",
    title: "Choose a video",
  },
  {
    body: "Switch modules from the titlebar. Trim is for cuts, Motion Blur is for smooth renders, and the others make upload copies.",
    target: "modules",
    title: "Pick a module",
  },
  {
    body: "In Trim, press I for the in point and O for the out point. Repeat I/O to keep multiple segments.",
    target: "properties",
    title: "Cut with the keyboard",
  },
  {
    body: "This panel shows the exact output plan. For Trim, your segments live here and export as one merged file.",
    target: "properties",
    title: "Check the output",
  },
  {
    body: "Settings installs video tools, the blur engine, and checks for app updates.",
    target: "settings",
    title: "Manage tools",
  },
  {
    body: "When everything is ready, export from the bottom bar. xype writes a new file and leaves the original alone.",
    target: "export",
    title: "Export",
  },
];

export function OnboardingTour({ onClose }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const rect = useTargetRect(step.target);
  const panelStyle = useMemo(() => getPanelStyle(rect), [rect]);
  const isLast = index === steps.length - 1;

  function finish() {
    localStorage.setItem("xype.onboardingComplete", "1");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/55">
      {rect && (
        <div
          className="pointer-events-none fixed rounded-md border border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
          style={{
            height: rect.height + 8,
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
          }}
        />
      )}
      <section
        className="fixed w-[min(360px,calc(100vw-2rem))] rounded-md border border-white/[0.12] bg-[#18191c] p-4 text-white shadow-2xl"
        style={panelStyle}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
            {index + 1} / {steps.length}
          </span>
          <button
            className="rounded px-2 py-1 text-[11px] text-white/45 hover:bg-white/[0.07] hover:text-white"
            onClick={finish}
            type="button"
          >
            Skip
          </button>
        </div>
        <h2 className="text-base font-semibold">{step.title}</h2>
        <p className="mt-2 text-sm leading-5 text-white/55">{step.body}</p>
        <div className="mt-4 flex justify-between gap-2">
          <Button
            disabled={index === 0}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
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
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function useTargetRect(target: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    function updateRect() {
      setRect(document.querySelector(`[data-tour="${target}"]`)?.getBoundingClientRect() ?? null);
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [target]);

  return rect;
}

function getPanelStyle(rect: DOMRect | null) {
  if (!rect) {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const width = Math.min(360, window.innerWidth - 32);
  const left =
    rect.right + width + 20 < window.innerWidth
      ? rect.right + 12
      : Math.max(16, Math.min(window.innerWidth - width - 16, rect.left));
  const top = Math.max(16, Math.min(window.innerHeight - 220, rect.bottom + 12));

  return {
    left,
    top,
  };
}
