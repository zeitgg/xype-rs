import { jobDefinitions, type JobMode } from "./types";

type Props = {
  mode: JobMode;
  onChange: (mode: JobMode) => void;
};

export function JobSwitcher({ mode, onChange }: Props) {
  return (
    <div className="ml-1 flex h-full min-w-0 items-center gap-1">
      {jobDefinitions.map((job) => (
        <button
          className={[
            "h-7 shrink-0 rounded px-2 text-[11px] transition-colors max-[760px]:px-1.5",
            mode === job.id
              ? "bg-white/[0.10] text-white"
              : "text-white/42 hover:bg-white/[0.06] hover:text-white/75",
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
