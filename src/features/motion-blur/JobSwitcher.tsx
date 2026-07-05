import { jobDefinitions, type JobMode } from "./types";

type Props = {
  mode: JobMode;
  onChange: (mode: JobMode) => void;
};

export function JobSwitcher({ mode, onChange }: Props) {
  return (
    <div className="ml-2 flex h-full min-w-0 items-center gap-1">
      {jobDefinitions.map((job) => (
        <button
          className={[
            "h-7 shrink-0 rounded-md border px-2.5 text-[11px] font-medium transition-colors max-[760px]:px-2",
            mode === job.id
              ? "border-border bg-card text-foreground shadow-xs"
              : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          ].join(" ")}
          key={job.id}
          onClick={() => onChange(job.id)}
          title={job.description}
          type="button"
        >
          <span className="max-[760px]:hidden">{job.label}</span>
          <span className="min-[761px]:hidden">{job.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
