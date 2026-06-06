import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  PauseIcon,
  PlayIcon,
  Scissor01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { MotionSettings, TrimSegment } from "./types";

type Props = {
  inputFps: number | null;
  onChangeSettings: (settings: MotionSettings) => void;
  onPickVideo: () => void;
  settings: MotionSettings;
  videoPath: string;
};

type TrimPatch = Partial<Pick<MotionSettings, "trimStart" | "trimEnd">>;

export function TrimViewer({
  inputFps,
  onChangeSettings,
  onPickVideo,
  settings,
  videoPath,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedVideoRef = useRef("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const sourceUrl = useMemo(() => convertFileSrc(videoPath), [videoPath]);
  const frameStep = inputFps ? 1 / inputFps : 1 / 30;
  const trimStart = clamp(settings.trimStart, 0, Math.max(duration, settings.trimStart));
  const trimEnd = clamp(settings.trimEnd, trimStart + frameStep, Math.max(duration, settings.trimEnd));
  const segments = settings.trimSegments;
  const selectedLength = getTotalSegmentLength(segments, trimStart, trimEnd);

  useEffect(() => {
    setCurrentTime(0);
    setPendingStart(null);
    setPlaying(false);
  }, [videoPath]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.code === "Space") {
        event.preventDefault();
        void togglePlayback();
      } else if (event.code === "KeyI") {
        event.preventDefault();
        setInPoint(currentTime);
      } else if (event.code === "KeyO") {
        event.preventDefault();
        setOutPoint(currentTime);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seek(currentTime - (event.shiftKey ? 1 : frameStep));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seek(currentTime + (event.shiftKey ? 1 : frameStep));
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [currentTime, frameStep, settings, trimEnd, trimStart]);

  function updateTrim(next: TrimPatch) {
    const nextStart = next.trimStart ?? settings.trimStart;
    const nextEnd = next.trimEnd ?? settings.trimEnd;
    const minGap = frameStep;
    onChangeSettings({
      ...settings,
      trimStart: clamp(nextStart, 0, Math.max(0, nextEnd - minGap)),
      trimEnd: clamp(nextEnd, nextStart + minGap, duration || nextEnd),
    });
  }

  function updateSegments(nextSegments: TrimSegment[]) {
    onChangeSettings({
      ...settings,
      trimSegments: sortSegments(nextSegments),
    });
  }

  function setInPoint(time: number) {
    setPendingStart(clamp(time, 0, duration || time));
    updateTrim({ trimStart: time });
  }

  function setOutPoint(time: number) {
    const start = pendingStart ?? settings.trimStart;
    const end = clamp(time, 0, duration || time);
    if (end <= start + frameStep) {
      updateTrim({ trimEnd: end });
      return;
    }

    const segment = {
      id: crypto.randomUUID(),
      start,
      end,
    };
    onChangeSettings({
      ...settings,
      trimStart: segment.start,
      trimEnd: segment.end,
      trimSegments: sortSegments([...settings.trimSegments, segment]),
    });
    setPendingStart(null);
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
    if (nextDuration > 0 && loadedVideoRef.current !== videoPath) {
      loadedVideoRef.current = videoPath;
      updateTrim({ trimStart: 0, trimEnd: nextDuration });
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
    <div className="flex min-h-0 flex-1 flex-col bg-[#0a0b0d]">
      <div className="relative min-h-0 flex-1 bg-black">
        <video
          className="h-full w-full object-contain"
          onClick={() => void togglePlayback()}
          onLoadedMetadata={handleLoadedMetadata}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onTimeUpdate={handleTimeUpdate}
          preload="metadata"
          ref={videoRef}
          src={sourceUrl}
        />
        <div className="absolute left-3 top-3 rounded bg-black/70 px-2.5 py-1.5 font-mono text-xs text-white/80 shadow-sm">
          {formatTime(currentTime)}
        </div>
        <button
          className="absolute right-3 top-3 rounded bg-black/70 px-2.5 py-1.5 text-[11px] font-medium text-white/75 shadow-sm hover:bg-black hover:text-white"
          onClick={onPickVideo}
          type="button"
        >
          Change video
        </button>
      </div>

      <div className="shrink-0 border-t border-white/[0.075] bg-[#141518] p-3">
        <div className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Button aria-label={playing ? "Pause" : "Play"} className="h-8 w-9 px-0" onClick={() => void togglePlayback()} size="sm" type="button">
              <HugeiconsIcon className="size-4" icon={playing ? PauseIcon : PlayIcon} />
            </Button>
            <Button aria-label="Back one frame" className="h-8 w-9 px-0" onClick={() => seek(currentTime - frameStep)} size="sm" type="button" variant="outline">
              <HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
            </Button>
            <Button aria-label="Forward one frame" className="h-8 w-9 px-0" onClick={() => seek(currentTime + frameStep)} size="sm" type="button" variant="outline">
              <HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
            </Button>
          </div>

          <div className="min-w-0 text-center">
            <div className="font-mono text-sm text-white/85">
              {pendingStart == null
                ? segments.length > 0
                  ? `${segments.length} segment${segments.length === 1 ? "" : "s"}`
                  : "Current range"
                : `In at ${formatTime(pendingStart)}`}
            </div>
            <div className="text-[11px] text-white/35">{formatTime(selectedLength)} selected for merged export</div>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <Button className="h-8 px-2" onClick={() => setInPoint(currentTime)} size="sm" type="button" variant="outline">
              <HugeiconsIcon className="mr-1.5 size-3.5" icon={Scissor01Icon} />
              In
            </Button>
            <Button className="h-8 px-2" onClick={() => setOutPoint(currentTime)} size="sm" type="button" variant="outline">
              <HugeiconsIcon className="mr-1.5 size-3.5" icon={Scissor01Icon} />
              Out
            </Button>
          </div>
        </div>

        <Timeline
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          onUpdateTrim={updateTrim}
          pendingStart={pendingStart}
          segments={segments}
          trimEnd={trimEnd}
          trimStart={trimStart}
        />

        <div className="mt-3 grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2">
          <TimeReadout label={pendingStart == null ? "Current in" : "Pending in"} value={pendingStart ?? trimStart} />
          <TimeReadout label="Current out" value={trimEnd} />
          <Button className="h-9" onClick={() => seek(pendingStart ?? trimStart)} type="button" variant="outline">
            Go in
          </Button>
          <Button
            className="h-9"
            onClick={() => {
              updateSegments([]);
              setPendingStart(null);
              updateTrim({ trimStart: 0, trimEnd: duration || settings.trimEnd });
            }}
            type="button"
            variant="outline"
          >
            Keep all
          </Button>
        </div>
      </div>
    </div>
  );
}

type TimelineProps = {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onUpdateTrim: (next: TrimPatch) => void;
  pendingStart: number | null;
  segments: TrimSegment[];
  trimEnd: number;
  trimStart: number;
};

function Timeline({
  currentTime,
  duration,
  onSeek,
  onUpdateTrim,
  pendingStart,
  segments,
  trimEnd,
  trimStart,
}: TimelineProps) {
  const ticks = Array.from({ length: 11 }, (_, index) => index * 10);

  return (
    <div className="relative h-14 rounded border border-white/[0.075] bg-[#0b0c0f] px-2">
      <div className="absolute inset-x-2 top-2 flex justify-between">
        {ticks.map((tick) => (
          <span key={tick} className="h-2 w-px bg-white/[0.12]" />
        ))}
      </div>
      <div className="absolute inset-x-2 top-6 h-3 rounded bg-white/[0.08]">
        {segments.length > 0 ? (
          segments.map((segment) => (
            <div
              className="absolute h-full rounded bg-[#e8e8e8]"
              key={segment.id}
              style={{
                left: `${percent(segment.start, duration)}%`,
                width: `${Math.max(0, percent(segment.end, duration) - percent(segment.start, duration))}%`,
              }}
            />
          ))
        ) : (
          <div
            className="absolute h-full rounded bg-[#e8e8e8]"
            style={{
              left: `${percent(trimStart, duration)}%`,
              width: `${Math.max(0, percent(trimEnd, duration) - percent(trimStart, duration))}%`,
            }}
          />
        )}
        {pendingStart != null && (
          <div
            className="absolute top-[-3px] h-[18px] rounded border border-white/70 bg-white/20"
            style={{
              left: `${percent(Math.min(pendingStart, currentTime), duration)}%`,
              width: `${Math.abs(percent(currentTime, duration) - percent(pendingStart, duration))}%`,
            }}
          />
        )}
        <div
          className="absolute top-[-7px] h-7 w-px bg-white"
          style={{
            left: `${percent(currentTime, duration)}%`,
          }}
        />
      </div>
      <input
        aria-label="Trim start"
        className="xype-trim-range absolute inset-x-2 top-3 z-20 h-9"
        max={duration || 1}
        min={0}
        onChange={(event) => onUpdateTrim({ trimStart: Number(event.currentTarget.value) })}
        step={0.01}
        type="range"
        value={trimStart}
      />
      <input
        aria-label="Trim end"
        className="xype-trim-range absolute inset-x-2 top-3 z-20 h-9"
        max={duration || 1}
        min={0}
        onChange={(event) => onUpdateTrim({ trimEnd: Number(event.currentTarget.value) })}
        step={0.01}
        type="range"
        value={trimEnd}
      />
      <input
        aria-label="Playhead"
        className="xype-range absolute inset-x-2 top-3 z-10 h-9"
        max={duration || 1}
        min={0}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
        step={0.01}
        type="range"
        value={currentTime}
      />
    </div>
  );
}

type TimeReadoutProps = {
  label: string;
  value: number;
};

function TimeReadout({ label, value }: TimeReadoutProps) {
  return (
    <div className="rounded border border-white/[0.075] bg-white/[0.035] px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-white/28">{label}</div>
      <div className="font-mono text-xs text-white/75">{formatTime(value)}</div>
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

function sortSegments(segments: TrimSegment[]) {
  return [...segments].sort((a, b) => a.start - b.start);
}

function getTotalSegmentLength(segments: TrimSegment[], trimStart: number, trimEnd: number) {
  if (segments.length === 0) return Math.max(0, trimEnd - trimStart);
  return segments.reduce((sum, segment) => sum + Math.max(0, segment.end - segment.start), 0);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return !["button", "checkbox", "radio", "range"].includes(target.type);
}
