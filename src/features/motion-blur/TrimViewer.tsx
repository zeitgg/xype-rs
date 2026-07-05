import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  PauseIcon,
  PlayIcon,
  PlusSignIcon,
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
const MIN_SEGMENT_SECONDS = 0.05;

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
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const sourceUrl = useMemo(() => convertFileSrc(videoPath), [videoPath]);
  const frameStep = inputFps ? 1 / inputFps : 1 / 30;
  const minGap = Math.max(MIN_SEGMENT_SECONDS, frameStep);
  const trimStart = clamp(settings.trimStart, 0, Math.max(duration, settings.trimStart));
  const trimEnd = clamp(settings.trimEnd, trimStart + minGap, Math.max(duration, settings.trimEnd));
  const segments = settings.trimSegments;
  const selectedLength = getTotalSegmentLength(segments, trimStart, trimEnd);
  const selectedSegment = selectedSegmentId
    ? segments.find((segment) => segment.id === selectedSegmentId) ?? null
    : null;

  useEffect(() => {
    setCurrentTime(0);
    setPendingStart(null);
    setPlaying(false);
    setSelectedSegmentId(null);
  }, [videoPath]);

  useEffect(() => {
    if (!selectedSegmentId) return;
    if (!segments.some((segment) => segment.id === selectedSegmentId)) {
      setSelectedSegmentId(null);
    }
  }, [segments, selectedSegmentId]);

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
      } else if (event.code === "KeyA") {
        event.preventDefault();
        addSegmentFromRange(trimStart, trimEnd);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedSegmentId) {
          event.preventDefault();
          removeSegment(selectedSegmentId);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [currentTime, frameStep, selectedSegmentId, settings, trimEnd, trimStart]);

  function updateTrim(next: TrimPatch) {
    const nextStart = next.trimStart ?? settings.trimStart;
    const nextEnd = next.trimEnd ?? settings.trimEnd;
    onChangeSettings({
      ...settings,
      trimStart: clamp(nextStart, 0, Math.max(0, nextEnd - minGap)),
      trimEnd: clamp(nextEnd, nextStart + minGap, duration || nextEnd),
    });
  }

  function updateRange(start: number, end: number) {
    const nextStart = clamp(start, 0, Math.max(0, (duration || end) - minGap));
    const nextEnd = clamp(end, nextStart + minGap, duration || end);
    const nextSegments =
      selectedSegmentId && pendingStart === null
        ? settings.trimSegments.map((segment) =>
            segment.id === selectedSegmentId ? { ...segment, start: nextStart, end: nextEnd } : segment,
          )
        : settings.trimSegments;

    onChangeSettings({
      ...settings,
      trimStart: nextStart,
      trimEnd: nextEnd,
      trimSegments: sortSegments(nextSegments),
    });
  }

  function updateSegments(nextSegments: TrimSegment[]) {
    onChangeSettings({
      ...settings,
      trimSegments: sortSegments(nextSegments),
    });
  }

  function setInPoint(time: number) {
    const start = clamp(time, 0, duration || time);
    setSelectedSegmentId(null);
    setPendingStart(start);
    updateTrim({ trimStart: start, trimEnd: Math.max(start + minGap, settings.trimEnd) });
  }

  function setOutPoint(time: number) {
    const start = pendingStart ?? settings.trimStart;
    const end = clamp(time, 0, duration || time);
    if (end <= start + minGap) {
      updateTrim({ trimEnd: end });
      return;
    }

    if (selectedSegment && pendingStart === null) {
      updateRange(selectedSegment.start, end);
      return;
    }

    addSegmentFromRange(start, end);
  }

  function addSegmentFromRange(startTime: number, endTime: number) {
    const start = clamp(Math.min(startTime, endTime), 0, duration || startTime);
    const end = clamp(Math.max(startTime, endTime), start + minGap, duration || endTime);
    if (end <= start + minGap) return;

    const segment: TrimSegment = {
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
    setSelectedSegmentId(segment.id);
    setPendingStart(null);
  }

  function selectSegment(segment: TrimSegment) {
    setPendingStart(null);
    setSelectedSegmentId(segment.id);
    updateTrim({ trimStart: segment.start, trimEnd: segment.end });
    seek(segment.start);
  }

  function removeSegment(id: string) {
    const nextSegments = settings.trimSegments.filter((segment) => segment.id !== id);
    updateSegments(nextSegments);
    if (selectedSegmentId === id) setSelectedSegmentId(null);
  }

  function splitAtPlayhead() {
    const target = selectedSegment ?? segments.find((segment) => currentTime > segment.start && currentTime < segment.end);
    if (!target || currentTime <= target.start + minGap || currentTime >= target.end - minGap) return;
    const nextSegments = settings.trimSegments.flatMap((segment) =>
      segment.id === target.id
        ? [
            { ...segment, id: crypto.randomUUID(), end: currentTime },
            { ...segment, id: crypto.randomUUID(), start: currentTime },
          ]
        : [segment],
    );
    setSelectedSegmentId(null);
    updateSegments(nextSegments);
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
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--xype-card)] p-3">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px] bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
        <div className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1.5 font-mono text-xs text-white/80 shadow-sm backdrop-blur">
          {formatTime(currentTime)}
        </div>
        <button
          className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1.5 text-[11px] font-bold text-white/75 shadow-sm backdrop-blur hover:bg-black hover:text-white"
          onClick={onPickVideo}
          type="button"
        >
          Change video
        </button>
      </div>

      <div className="mt-3 shrink-0 rounded-[18px] bg-[var(--xype-card-alt)] p-3">
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
                ? selectedSegment
                  ? `Segment ${segments.findIndex((segment) => segment.id === selectedSegment.id) + 1}`
                  : segments.length > 0
                    ? `${segments.length} segment${segments.length === 1 ? "" : "s"}`
                    : "Full clip"
                : `In at ${formatTime(pendingStart)}`}
            </div>
            <div className="text-[11px] text-white/35">{formatTime(selectedLength)} kept in export</div>
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
          minGap={minGap}
          onSeek={seek}
          onSelectSegment={selectSegment}
          onUpdateRange={updateRange}
          pendingStart={pendingStart}
          selectedSegmentId={selectedSegmentId}
          segments={segments}
          trimEnd={trimEnd}
          trimStart={trimStart}
        />

        <div className="mt-3 grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-2">
          <TimeReadout label={pendingStart == null ? "In" : "Pending in"} value={pendingStart ?? trimStart} />
          <TimeReadout label="Out" value={trimEnd} />
          <Button className="h-9" disabled={trimEnd <= trimStart + minGap} onClick={() => addSegmentFromRange(trimStart, trimEnd)} type="button" variant="outline">
            <HugeiconsIcon className="mr-1.5 size-3.5" icon={PlusSignIcon} />
            Add
          </Button>
          <Button className="h-9" disabled={!selectedSegment} onClick={splitAtPlayhead} type="button" variant="outline">
            Split
          </Button>
          <Button
            className="h-9"
            onClick={() => {
              updateSegments([]);
              setPendingStart(null);
              setSelectedSegmentId(null);
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
  minGap: number;
  onSeek: (time: number) => void;
  onSelectSegment: (segment: TrimSegment) => void;
  onUpdateRange: (start: number, end: number) => void;
  pendingStart: number | null;
  selectedSegmentId: string | null;
  segments: TrimSegment[];
  trimEnd: number;
  trimStart: number;
};

function Timeline({
  currentTime,
  duration,
  minGap,
  onSeek,
  onSelectSegment,
  onUpdateRange,
  pendingStart,
  selectedSegmentId,
  segments,
  trimEnd,
  trimStart,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const ticks = Array.from({ length: 11 }, (_, index) => index * 10);

  function timeFromPointer(event: React.PointerEvent<HTMLElement>) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    return clamp(((event.clientX - rect.left) / rect.width) * duration, 0, duration);
  }

  function beginDrag(
    event: React.PointerEvent<HTMLElement>,
    drag: "playhead" | "start" | "end",
  ) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || !duration) return;
      const time = clamp(((moveEvent.clientX - rect.left) / rect.width) * duration, 0, duration);
      if (drag === "playhead") onSeek(time);
      if (drag === "start") onUpdateRange(time, trimEnd);
      if (drag === "end") onUpdateRange(trimStart, time);
    };
    const stop = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", stop);
      target.removeEventListener("pointercancel", stop);
    };

    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", stop);
    target.addEventListener("pointercancel", stop);
  }

  const hasSegments = segments.length > 0;
  const rangeStart = pendingStart == null ? trimStart : Math.min(pendingStart, currentTime);
  const rangeEnd = pendingStart == null ? trimEnd : Math.max(pendingStart, currentTime);

  return (
    <div className="relative h-[72px] rounded-[16px] bg-[var(--xype-subtle)] px-3">
      <div className="absolute inset-x-3 top-3 flex justify-between">
        {ticks.map((tick) => (
          <span key={tick} className="h-2 w-px bg-white/[0.12]" />
        ))}
      </div>
      <div
        className="absolute inset-x-3 top-8 h-5 cursor-crosshair rounded-full bg-white/[0.07]"
        onPointerDown={(event) => {
          onSeek(timeFromPointer(event));
          beginDrag(event, "playhead");
        }}
        ref={trackRef}
        role="slider"
        tabIndex={-1}
      >
        {hasSegments ? (
          segments.map((segment) => (
            <button
              aria-label={`Select segment ${formatTime(segment.start)} to ${formatTime(segment.end)}`}
              className={[
                "absolute top-0 h-full rounded-full border transition",
                selectedSegmentId === segment.id
                  ? "border-white bg-white"
                  : "border-white/15 bg-white/65 hover:bg-white/85",
              ].join(" ")}
              key={segment.id}
              onClick={(event) => {
                event.stopPropagation();
                onSelectSegment(segment);
              }}
              style={{
                left: `${percent(segment.start, duration)}%`,
                width: `${Math.max(0, percent(segment.end, duration) - percent(segment.start, duration))}%`,
              }}
            />
          ))
        ) : (
          <div
            className="absolute top-0 h-full rounded-full bg-white/80"
            style={{
              left: `${percent(trimStart, duration)}%`,
              width: `${Math.max(0, percent(trimEnd, duration) - percent(trimStart, duration))}%`,
            }}
          />
        )}
        <div
          className="absolute top-[-4px] h-[28px] rounded-full border border-white/70 bg-white/18"
          style={{
            left: `${percent(rangeStart, duration)}%`,
            width: `${Math.max(0, percent(rangeEnd, duration) - percent(rangeStart, duration))}%`,
          }}
        />
        <button
          aria-label="Drag trim in"
          className="absolute top-[-8px] z-20 h-9 w-3 -translate-x-1/2 rounded-full border border-white/70 bg-[var(--xype-card)] shadow"
          disabled={!duration}
          onPointerDown={(event) => beginDrag(event, "start")}
          style={{ left: `${percent(trimStart, duration)}%` }}
          type="button"
        />
        <button
          aria-label="Drag trim out"
          className="absolute top-[-8px] z-20 h-9 w-3 -translate-x-1/2 rounded-full border border-white/70 bg-[var(--xype-card)] shadow"
          disabled={!duration || trimEnd <= minGap}
          onPointerDown={(event) => beginDrag(event, "end")}
          style={{ left: `${percent(trimEnd, duration)}%` }}
          type="button"
        />
        <div
          className="pointer-events-none absolute top-[-10px] z-10 h-10 w-px bg-white"
          style={{
            left: `${percent(currentTime, duration)}%`,
          }}
        />
      </div>
      <div className="absolute inset-x-3 bottom-2 flex justify-between font-mono text-[10px] text-white/28">
        <span>{formatTime(0)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

type TimeReadoutProps = {
  label: string;
  value: number;
};

function TimeReadout({ label, value }: TimeReadoutProps) {
  return (
    <div className="rounded-[14px] bg-[var(--xype-subtle)] px-2.5 py-1.5">
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
