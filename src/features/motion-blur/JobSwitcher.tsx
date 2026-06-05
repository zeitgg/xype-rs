import { HugeiconsIcon } from "@hugeicons/react";
import {
  DiscordIcon,
  FileZipIcon,
  MagicWand02Icon,
  Scissor01Icon,
  TiktokIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { jobDefinitions, type JobMode } from "./types";

type Props = {
  mode: JobMode;
  onChange: (mode: JobMode) => void;
};

const icons = {
  motion: MagicWand02Icon,
  trim: Scissor01Icon,
  compress: FileZipIcon,
  discord: DiscordIcon,
  youtube: YoutubeIcon,
  tiktok: TiktokIcon,
} satisfies Record<JobMode, typeof MagicWand02Icon>;

export function JobSwitcher({ mode, onChange }: Props) {
  return (
    <div className="ml-1 flex h-full min-w-0 items-center gap-1">
      {jobDefinitions.map((job) => (
        <button
          className={[
            "flex h-7 shrink-0 items-center rounded px-2 text-[11px] transition-colors max-[760px]:w-8 max-[760px]:justify-center max-[760px]:px-0",
            mode === job.id
              ? "bg-white/[0.10] text-white"
              : "text-white/42 hover:bg-white/[0.06] hover:text-white/75",
          ].join(" ")}
          key={job.id}
          onClick={() => onChange(job.id)}
          title={job.description}
          type="button"
        >
          <HugeiconsIcon className="size-3.5 min-[761px]:mr-1.5" icon={icons[job.id]} />
          <span className="max-[760px]:hidden">{job.label}</span>
        </button>
      ))}
    </div>
  );
}
