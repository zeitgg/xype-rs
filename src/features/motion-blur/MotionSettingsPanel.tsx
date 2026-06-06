import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { EncoderSupport } from "./api";
import type { BlurPreset, JobMode, MotionSettings, TrimSegment, UserMotionPreset } from "./types";

type Props = {
  encoderSupport: EncoderSupport | null;
  mode: JobMode;
  motionQueueFiles: string[];
  onChange: (settings: MotionSettings) => void;
  onAddMotionFiles: () => void;
  onExportPreset: () => void;
  onImportPreset: () => void;
  onPickMask: () => void;
  onPresetChange: (preset: BlurPreset) => void;
  onRemoveMotionFile: (path: string) => void;
  onRunMotionFiles: (paths: string[]) => void;
  onSavePreset: () => void;
  onSendSegmentsToMotion: (segments: TrimSegment[]) => void;
  preset: BlurPreset;
  settings: MotionSettings;
  userPresets: UserMotionPreset[];
};

const weightings: MotionSettings["blendWeighting"][] = ["equal", "gaussian", "pyramid", "vegas"];
const interpolationSpeeds: MotionSettings["interpolationSpeed"][] = ["medium", "fast", "faster", "fastest"];
const interpolationTunings: MotionSettings["interpolationTuning"][] = ["weak", "smooth", "film", "animation"];
const interpolationAlgorithms: MotionSettings["interpolationAlgorithm"][] = [23, 13, 2];
const maskPresets: Array<{ id: MotionSettings["maskPreset"]; label: string }> = [
  { id: "none", label: "No mask" },
  { id: "valorant-minimal", label: "VALORANT minimal" },
  { id: "valorant-detailed", label: "VALORANT detailed" },
  { id: "custom", label: "Custom PNG" },
];
const weightingLabels: Record<MotionSettings["blendWeighting"], string> = {
  equal: "Even",
  gaussian: "Smooth",
  pyramid: "Soft",
  vegas: "Sharp",
};

const presets: Array<{ id: BlurPreset; label: string; description: string }> = [
  { id: "subtle", label: "Light", description: "A small cleanup for normal clips." },
  { id: "recommended", label: "Recommended", description: "Best starting point for most videos." },
  { id: "strong", label: "Strong", description: "More blur for fast movement." },
];

export function MotionSettingsPanel({
  encoderSupport,
  mode,
  motionQueueFiles,
  onAddMotionFiles,
  onChange,
  onExportPreset,
  onImportPreset,
  onPickMask,
  onPresetChange,
  onRemoveMotionFile,
  onRunMotionFiles,
  onSavePreset,
  onSendSegmentsToMotion,
  preset,
  settings,
  userPresets,
}: Props) {
  function update(next: Partial<MotionSettings>) {
    onChange({ ...settings, ...next });
  }

  function updateSegments(trimSegments: TrimSegment[]) {
    update({ trimSegments: [...trimSegments].sort((a, b) => a.start - b.start) });
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center border-b border-white/[0.075] px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">
          Properties
        </h2>
      </div>
      <div className="xype-scrollbar min-h-0 flex-1 overflow-auto p-4">
        {mode === "motion" ? (
          <div className="space-y-4">
            <PanelGroup title="Presets">
              <div className="grid grid-cols-3 gap-2">
                {presets.map((item) => (
                  <Button
                    className="px-1"
                    key={item.id}
                    onClick={() => onPresetChange(item.id)}
                    size="sm"
                    type="button"
                    variant={preset === item.id ? "default" : "outline"}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              {userPresets.length > 0 && (
                <Select
                  onValueChange={(id) => {
                    const selected = userPresets.find((item) => item.id === id);
                    if (selected) onChange(selected.settings);
                  }}
                >
                  <SelectTrigger className="w-full border-white/[0.075] bg-white/[0.045]">
                    <SelectValue placeholder="User presets" />
                  </SelectTrigger>
                  <SelectContent>
                    {userPresets.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={onSavePreset} size="sm" type="button" variant="outline">
                  Save
                </Button>
                <Button onClick={onImportPreset} size="sm" type="button" variant="outline">
                  Import
                </Button>
                <Button onClick={onExportPreset} size="sm" type="button" variant="outline">
                  Export
                </Button>
              </div>
            </PanelGroup>

            <MotionQueuePanel
              files={motionQueueFiles}
              onAddFiles={onAddMotionFiles}
              onRemoveFile={onRemoveMotionFile}
              onRunFiles={onRunMotionFiles}
            />

            <PanelGroup title="Frame blending">
              <ToggleRow
                checked={settings.frameBlendingEnabled}
                label="Blend frames"
                onCheckedChange={(frameBlendingEnabled) => update({ frameBlendingEnabled })}
              />
              <NumberField
                label="Output FPS"
                min={24}
                onChange={(outputFps) => update({ outputFps })}
                value={settings.outputFps}
              />
              <SliderField
                label="Intensity"
                max={4}
                min={0}
                onChange={(blurIntensity) => update({ blurIntensity })}
                step={0.05}
                value={settings.blurIntensity}
              />
              <ButtonGrid
                label="Weighting"
                options={weightings.map((value) => ({ label: weightingLabels[value], value }))}
                onChange={(blendWeighting) => update({ blendWeighting })}
                value={settings.blendWeighting}
              />
            </PanelGroup>

            <PanelGroup title="Interpolation">
              <ToggleRow
                checked={settings.interpolationEnabled}
                label="Generate in-between frames"
                onCheckedChange={(interpolationEnabled) => update({ interpolationEnabled })}
              />
              <NumberField
                label="Interpolated FPS"
                min={60}
                onChange={(interpolateFps) => update({ interpolateFps })}
                value={settings.interpolateFps}
              />
              <SelectField
                label="Speed"
                onChange={(interpolationSpeed) => update({ interpolationSpeed })}
                options={interpolationSpeeds}
                value={settings.interpolationSpeed}
              />
              <SelectField
                label="Tuning"
                onChange={(interpolationTuning) => update({ interpolationTuning })}
                options={interpolationTunings}
                value={settings.interpolationTuning}
              />
              <SelectField
                label="Algorithm"
                onChange={(value) => update({ interpolationAlgorithm: Number(value) as MotionSettings["interpolationAlgorithm"] })}
                options={interpolationAlgorithms.map(String)}
                value={String(settings.interpolationAlgorithm)}
              />
              <ToggleRow
                checked={settings.interpolationGpu}
                label="Use GPU"
                onCheckedChange={(interpolationGpu) => update({ interpolationGpu })}
              />
            </PanelGroup>

            <PanelGroup title="Flowblur">
              <ToggleRow
                checked={settings.flowblurEnabled}
                label="RSMB-style blur"
                onCheckedChange={(flowblurEnabled) => update({ flowblurEnabled })}
              />
              <SliderField
                label="Amount"
                max={200}
                min={0}
                onChange={(flowblurAmount) => update({ flowblurAmount: Math.round(flowblurAmount) })}
                step={1}
                value={settings.flowblurAmount}
              />
            </PanelGroup>

            <PanelGroup title="Mask">
              <SelectField
                label="Mask"
                onChange={(maskPreset) => update({ maskPreset: maskPreset as MotionSettings["maskPreset"] })}
                options={maskPresets.map((item) => item.id)}
                renderLabel={(value) => maskPresets.find((item) => item.id === value)?.label ?? value}
                value={settings.maskPreset}
              />
              <div className="flex items-center gap-3">
                <Button onClick={onPickMask} size="sm" type="button" variant="outline">
                  Pick PNG
                </Button>
                <span className="min-w-0 truncate text-[11px] text-white/35">
                  {settings.maskPreset === "custom"
                    ? settings.maskPath || "Pick a PNG mask."
                    : settings.maskPreset === "none"
                      ? "No mask selected."
                      : "Built-in mask included with xype."}
                </span>
              </div>
            </PanelGroup>

            <PanelGroup title="Output">
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Quality"
                  max={35}
                  min={1}
                  onChange={(crf) => update({ crf })}
                  value={settings.crf}
                />
                <NumberField
                  label="Speed"
                  min={0.25}
                  onChange={(timescale) => update({ timescale })}
                  step={0.25}
                  value={settings.timescale}
                />
              </div>
              <ButtonGrid
                label="Encoder"
                options={[
                  { label: "Most PCs", value: "libx264" },
                  { label: "NVIDIA", value: "h264_nvenc", disabled: encoderSupport?.h264Nvenc === false },
                ]}
                onChange={(encoder) => update({ encoder })}
                value={settings.encoder}
              />
              {encoderSupport?.h264Nvenc === false && (
                <p className="text-[11px] leading-4 text-white/35">
                  NVIDIA encoding is unavailable. CPU encoding will be used.
                </p>
              )}
            </PanelGroup>
          </div>
        ) : (
          <div className="rounded-md border border-white/[0.075] bg-white/[0.025] p-3">
            <p className="text-sm font-semibold">
              {mode === "trim" && "Cut segment"}
              {mode === "compress" && "Upload-ready compression"}
              {mode === "discord" && "Discord 8 MB copy"}
              {mode === "youtube" && "2160p YouTube copy"}
              {mode === "tiktok" && "TikTok FPS copy"}
            </p>
            <p className="mt-1 text-xs text-white/38">
              {mode === "trim"
                ? "The highlighted range under the viewer will be exported."
                : "xype chooses practical settings automatically for this module."}
            </p>
            {mode === "trim" && (
              <TrimSegmentPanel
                onSendToMotion={onSendSegmentsToMotion}
                onUpdate={updateSegments}
                settings={settings}
              />
            )}
          </div>
        )}

      </div>
    </section>
  );
}

type TrimSegmentPanelProps = {
  onSendToMotion: (segments: TrimSegment[]) => void;
  onUpdate: (segments: TrimSegment[]) => void;
  settings: MotionSettings;
};

function PanelGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-3.5 rounded-md border border-white/[0.075] bg-white/[0.025] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/38">{title}</p>
      {children}
    </section>
  );
}

function ToggleRow({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-white/68">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SliderField({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-white/68">{label}</Label>
        <span className="font-mono text-xs text-white/35">{Number.isInteger(value) ? value : value.toFixed(2)}</span>
      </div>
      <Slider
        max={max}
        min={min}
        onValueChange={([nextValue]) => onChange(nextValue)}
        step={step}
        value={[value]}
      />
    </div>
  );
}

function ButtonGrid<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: Array<{ disabled?: boolean; label: string; value: TValue }>;
  value: TValue;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-white/68">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <Button
            className="px-2"
            disabled={option.disabled}
            key={option.value}
            onClick={() => onChange(option.value)}
            size="sm"
            type="button"
            variant={value === option.value ? "default" : "outline"}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SelectField<TValue extends string>({
  label,
  onChange,
  options,
  renderLabel = (value) => value,
  value,
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: TValue[];
  renderLabel?: (value: TValue) => string;
  value: TValue;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-white/68">{label}</Label>
      <Select onValueChange={(nextValue) => onChange(nextValue as TValue)} value={value}>
        <SelectTrigger className="w-full border-white/[0.075] bg-white/[0.045]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {renderLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type MotionQueuePanelProps = {
  files: string[];
  onAddFiles: () => void;
  onRemoveFile: (path: string) => void;
  onRunFiles: (paths: string[]) => void;
};

function MotionQueuePanel({ files, onAddFiles, onRemoveFile, onRunFiles }: MotionQueuePanelProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const selectedFiles = selectedPaths.length > 0 ? files.filter((file) => selectedPaths.includes(file)) : files;

  useEffect(() => {
    setSelectedPaths((paths) => paths.filter((path) => files.includes(path)));
  }, [files]);

  useEffect(() => {
    if (!contextMenu) return;

    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [contextMenu]);

  function toggleFile(path: string) {
    setSelectedPaths((paths) =>
      paths.includes(path) ? paths.filter((selectedPath) => selectedPath !== path) : [...paths, path],
    );
  }

  function runSelected() {
    setContextMenu(null);
    onRunFiles(selectedFiles);
  }

  return (
    <PanelGroup title="Motion queue">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onAddFiles} size="sm" type="button" variant="outline">
          Add clips
        </Button>
        <Button disabled={selectedFiles.length === 0} onClick={runSelected} size="sm" type="button">
          Render selected
        </Button>
      </div>
      {files.length > 0 ? (
        <div className="xype-scrollbar max-h-40 overflow-auto rounded border border-white/[0.075] bg-black/10">
          {files.map((file, index) => (
            <div
              className={[
                "grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 border-b border-white/[0.06] px-2 py-2 last:border-b-0",
                selectedPaths.includes(file) ? "bg-white/[0.07]" : "hover:bg-white/[0.035]",
              ].join(" ")}
              key={file}
              onClick={() => toggleFile(file)}
              onContextMenu={(event) => {
                event.preventDefault();
                if (!selectedPaths.includes(file)) setSelectedPaths([file]);
                setContextMenu({ x: event.clientX, y: event.clientY });
              }}
              role="button"
              tabIndex={0}
            >
              <span className="rounded bg-white/[0.07] px-2 py-1 text-center text-[11px] text-white/65">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs text-white/75">{fileName(file)}</div>
                <div className="mt-0.5 truncate text-[11px] text-white/32">{file}</div>
              </div>
              <button
                aria-label={`Remove ${fileName(file)}`}
                className="flex size-7 items-center justify-center rounded text-white/35 hover:bg-white/[0.06] hover:text-white/80"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveFile(file);
                }}
                type="button"
              >
                <HugeiconsIcon className="size-4" icon={Delete02Icon} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-white/35">
          Add cut clips or existing video files when you want to batch render motion blur.
        </p>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 w-48 rounded-md border border-white/[0.12] bg-[#17181b] p-1 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full rounded px-2 py-2 text-left text-xs text-white/70 hover:bg-white/[0.07] hover:text-white"
            onClick={runSelected}
            type="button"
          >
            Render in Motion Blur
          </button>
        </div>
      )}
    </PanelGroup>
  );
}

function TrimSegmentPanel({ onSendToMotion, onUpdate, settings }: TrimSegmentPanelProps) {
  const activeSegment = {
    id: "active",
    start: settings.trimStart,
    end: settings.trimEnd,
  };
  const visibleSegments = useMemo(
    () => (settings.trimSegments.length > 0 ? settings.trimSegments : [activeSegment]),
    [settings.trimEnd, settings.trimSegments, settings.trimStart],
  );
  const totalDuration = useMemo(
    () => visibleSegments.reduce((sum, segment) => sum + Math.max(0, segment.end - segment.start), 0),
    [visibleSegments],
  );

  function removeSegment(id: string) {
    onUpdate(settings.trimSegments.filter((segment) => segment.id !== id));
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded border border-white/[0.06] bg-black/15 p-3">
        <div className="flex justify-between text-xs">
          <span className="text-white/38">Kept pieces</span>
          <span className="font-mono text-white/70">{visibleSegments.length}</span>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-white/38">Output length</span>
          <span className="font-mono text-white/70">{formatSeconds(totalDuration)}</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button
          disabled={visibleSegments.length === 0}
          onClick={() => onSendToMotion(visibleSegments)}
          size="sm"
          type="button"
        >
          Send to Motion Blur
        </Button>
        <Button
          disabled={settings.trimSegments.length === 0}
          onClick={() => onUpdate([])}
          size="sm"
          type="button"
          variant="outline"
        >
          Clear
        </Button>
      </div>

      <div className="xype-scrollbar max-h-72 overflow-auto rounded border border-white/[0.075] bg-black/10">
        {visibleSegments.map((segment, index) => (
          <div
            className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 border-b border-white/[0.06] px-2 py-2 last:border-b-0"
            key={segment.id}
          >
            <span className="rounded bg-white/[0.07] px-2 py-1 text-center text-[11px] text-white/65">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="truncate font-mono text-xs text-white/75">
                {formatSeconds(segment.start)} - {formatSeconds(segment.end)}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-white/32">
                {formatSeconds(Math.max(0, segment.end - segment.start))}
              </div>
            </div>
            {settings.trimSegments.length > 0 ? (
              <button
                aria-label={`Remove segment ${index + 1}`}
                className="flex size-7 items-center justify-center rounded text-white/35 hover:bg-white/[0.06] hover:text-white/80"
                onClick={(event) => {
                  event.stopPropagation();
                  removeSegment(segment.id);
                }}
                type="button"
              >
                <HugeiconsIcon className="size-4" icon={Delete02Icon} />
              </button>
            ) : (
              <span className="text-center text-[11px] text-white/28">range</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00.00";
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);
  return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}.${centiseconds
    .toString()
    .padStart(2, "0")}`;
}

function fileName(path: string) {
  return path.slice(Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/")) + 1) || path;
}

type NumberFieldProps = {
  label: string;
  max?: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
};

function NumberField({ label, max, min, onChange, step = 1, value }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-white/68">{label}</Label>
      <Input
        className="border-white/[0.075] bg-white/[0.045] text-white"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step={step}
        type="number"
        value={value}
      />
    </div>
  );
}
