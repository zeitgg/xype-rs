import { Progress } from "@/components/ui/progress";

type Props = {
  jobLabel: string;
  processing: boolean;
  progress: number;
  status: string;
};

export function JobProgressToast({ jobLabel, processing, progress, status }: Props) {
  if (!processing) return null;

  return (
    <section className="fixed bottom-16 right-4 z-40 w-[min(320px,calc(100vw-2rem))] rounded-lg border border-white/[0.12] bg-[#17181b]/95 p-3 text-white shadow-2xl backdrop-blur-md animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{jobLabel}</p>
          <p className="mt-1 truncate text-xs text-white/40">{status || "Processing video"}</p>
        </div>
        <span className="font-mono text-xs text-white/45">{progress}%</span>
      </div>
      <Progress className="mt-3" value={progress} />
    </section>
  );
}
