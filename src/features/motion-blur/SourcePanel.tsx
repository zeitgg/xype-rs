import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PauseIcon,
  PlayIcon,
  Scissor01Icon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { jobDefinitions, type JobMode, type MotionSettings } from "./types";

type Props = {
  inputFps: number | null;
  mode: JobMode;
  onChangeSettings: (settings: MotionSettings) => void;
  onPickVideo: () => void;
  settings: MotionSettings;
  videoPath: string;
};

export function SourcePanel({
  inputFps,
  mode,
  onChangeSettings,
  onPickVideo,
  settings,
  videoPath,
}: Props) {
  const job = jobDefinitions.find((item) => item.id === mode) ?? jobDefinitions[0];
  const showTrimViewer = mode === "trim" && Boolean(videoPath);

  return (
    <section className="flex min-h-0 flex-col bg-[#101114]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/[0.075] px-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">Source</h2>
        <span className="max-w-[55%] truncate text-[11px] text-white/35">
          {videoPath ? videoPath.split(/[\\/]/).pop() : "No file selected"}
        </span>
      </div>

      {showTrimViewer ? (
        <TrimViewer
          onChangeSettings={onChangeSettings}
          onPickVideo={onPickVideo}
          settings={settings}
          videoPath={videoPath}
        />
      ) : (
        <button
          className="m-4 flex min-h-0 flex-1 flex-col items-center justify-center rounded-md border border-dashed border-white/[0.12] bg-[#0b0c0e] px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors hover:border-white/25 hover:bg-[#121316]"
          onClick={onPickVideo}
          type="button"
        >
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.075] bg-white/[0.035]">
            <span className="h-7 w-9 rounded border border-white/35 bg-white/[0.06]" />
          </span>
          <span className="text-lg font-semibold">{videoPath ? job.label : "Choose video"}</span>
          <span className="mt-2 max-w-md break-all text-xs text-white/40">
            {videoPath || `${job.description} Pick an MP4, MOV, MKV, AVI, or WebM file.`}
          </span>
          <span className="mt-5 rounded bg-white px-3 py-1.5 text-xs font-medium text-black shadow-sm">
            {videoPath ? "Change video" : "Browse files"}
          </span>
        </button>
      )}

      {inputFps && (
        <p className="shrink-0 border-t border-white/[0.075] px-3 py-2 text-[11px] text-white/35">
          Detected {inputFps.toFixed(2)} FPS
        </p>
      )}
    </section>
  );
}

type TrimViewerProps = {
  onChangeSettings: (settings: MotionSettings) => void;
  onPickVideo: () => void;
  settings: MotionSettings;
  videoPath: string;
};

function TrimViewer({ onChangeSettings, onPickVideo, settings, videoPath }: TrimViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const sourceUrl = useMemo(() => convertFileSrc(videoPath), [videoPath]);
  const trimStart = clamp(settings.trimStart, 0, Math.max(duration, settings.trimStart));
  const trimEnd = clamp(settings.trimEnd, trimStart + 0.1, Math.max(duration, settings.trimEnd));
  const selectedLength = Math.max(0, trimEnd - trimStart);

  useEffect(() => {
    setCurrentTime(0);
    setPlaying(false);
  }, [videoPath]);

  function updateTrim(next: Partial<Pick<MotionSettings, "trimStart" | "trimEnd">>) {
    const nextStart = next.trimStart ?? settings.trimStart;
    const nextEnd = next.trimEnd ?? settings.trimEnd;
    onChangeSettings({
      ...settings,
      trimStart: clamp(nextStart, 0, Math.max(0, nextEnd - 0.1)),
      trimEnd: clamp(nextEnd, nextStart + 0.1, duration || nextEnd),
    });
  }

  function seek(time: number) {
    const next = clamp(time, 0, duration || time);
    const video = videoRef.current;
    if (video) video.currentTime = next;
    setCurrentTime(next);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      await video.play();
    } else {
      video.pause();
    }
  }

  function handleLoadedMetadata() {
    const nextDuration = videoRef.current?.duration ?? 0;
    setDuration(nextDuration);
    if (nextDuration > 0 && settings.trimEnd <= settings.trimStart) {
      updateTrim({ trimStart: 0, trimEnd: Math.min(nextDuration, 10) });
    } else if (nextDuration > 0 && settings.trimEnd > nextDuration) {
      updateTrim({ trimEnd: nextDuration });
    }
  }

  function handleTimeUpdate() {
    const time = videoRef.current?.currentTime ?? 0;
    setCurrentTime(time);
    if (playing && time >= trimEnd) {
      videoRef.current?.pause();
      seek(trimEnd);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 bg-black">
        <video
          className="h-full w-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onTimeUpdate={handleTimeUpdate}
          preload="metadata"
          ref={videoRef}
          src={sourceUrl}
        />
        <button
          className="absolute right-3 top-3 rounded bg-black/70 px-2.5 py-1.5 text-[11px] font-medium text-white/75 shadow-sm hover:bg-black hover:text-white"
          onClick={onPickVideo}
          type="button"
        >
          Change video
        </button>
      </div>

      <div className="shrink-0 border-t border-white/[0.075] bg-[#141518] p-3">
        <div className="mb-3 flex items-center gap-2">
          <Button className="h-8 w-9 px-0" onClick={togglePlayback} size="sm" type="button">
            <HugeiconsIcon className="size-4" icon={playing ? PauseIcon : PlayIcon} />
          </Button>
          <Button
            className="h-8 px-2"
            onClick={() => seek(trimStart)}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon className="mr-1.5 size-3.5" icon={VideoReplayIcon} />
            Start
          </Button>
          <Button
            className="h-8 px-2"
            onClick={() => updateTrim({ trimStart: currentTime })}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon className="mr-1.5 size-3.5" icon={Scissor01Icon} />
            In
          </Button>
          <Button
            className="h-8 px-2"
            onClick={() => updateTrim({ trimEnd: currentTime })}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon className="mr-1.5 size-3.5" icon={Scissor01Icon} />
            Out
          </Button>
          <div className="ml-auto text-right text-[11px] text-white/45">
            <div>{formatTime(currentTime)} / {formatTime(duration)}</div>
            <div>{formatTime(selectedLength)} selected</div>
          </div>
        </div>

        <div className="relative h-9">
          <div className="absolute inset-x-0 top-4 h-1.5 rounded-full bg-white/[0.08]">
            <div
              className="absolute h-full rounded-full bg-white/65"
              style={{
                left: `${percent(trimStart, duration)}%`,
                width: `${Math.max(0, percent(trimEnd, duration) - percent(trimStart, duration))}%`,
              }}
            />
            <div
              className="absolute top-[-5px] h-4 w-px bg-white"
              style={{ left: `${percent(currentTime, duration)}%` }}
            />
          </div>
          <input
            aria-label="Trim start"
            className="xype-trim-range absolute inset-x-0 top-0 z-20 h-9 w-full"
            max={duration || 1}
            min={0}
            onChange={(event) => updateTrim({ trimStart: Number(event.currentTarget.value) })}
            step={0.01}
            type="range"
            value={trimStart}
          />
          <input
            aria-label="Trim end"
            className="xype-trim-range absolute inset-x-0 top-0 z-20 h-9 w-full"
            max={duration || 1}
            min={0}
            onChange={(event) => updateTrim({ trimEnd: Number(event.currentTarget.value) })}
            step={0.01}
            type="range"
            value={trimEnd}
          />
          <input
            aria-label="Playhead"
            className="xype-range absolute inset-x-0 top-0 z-10 h-9 w-full"
            max={duration || 1}
            min={0}
            onChange={(event) => seek(Number(event.currentTarget.value))}
            step={0.01}
            type="range"
            value={currentTime}
          />
        </div>

        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <TimeField
            label="Start"
            max={Math.max(0, trimEnd - 0.1)}
            onChange={(trimStart) => updateTrim({ trimStart })}
            value={trimStart}
          />
          <TimeField
            label="End"
            max={duration || trimEnd}
            min={trimStart + 0.1}
            onChange={(trimEnd) => updateTrim({ trimEnd })}
            value={trimEnd}
          />
          <Button
            className="h-9"
            onClick={() => updateTrim({ trimStart: 0, trimEnd: duration || settings.trimEnd })}
            type="button"
            variant="outline"
          >
            Full
          </Button>
        </div>
      </div>
    </div>
  );
}

type TimeFieldProps = {
  label: string;
  max: number;
  min?: number;
  onChange: (value: number) => void;
  value: number;
};

function TimeField({ label, max, min = 0, onChange, value }: TimeFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-white/45">{label}</Label>
      <Input
        className="h-9 border-white/[0.075] bg-white/[0.045] text-white"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={0.01}
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function percent(value: number, duration: number) {
  if (!duration) return 0;
  return clamp((value / duration) * 100, 0, 100);
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00.00";
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);
  return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}.${centiseconds
    .toString()
    .padStart(2, "0")}`;
}
