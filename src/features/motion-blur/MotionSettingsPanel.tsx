import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  onDeletePreset: (id: string) => void;
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
const compressModes: Array<{ label: string; value: MotionSettings["compressMode"] }> = [
  { label: "Balanced", value: "balanced" },
  { label: "Small file", value: "small" },
  { label: "High quality", value: "high" },
];
const compressHeights: Array<{ label: string; value: MotionSettings["compressMaxHeight"] }> = [
  { label: "Original", value: "source" },
  { label: "4K", value: "2160" },
  { label: "1440p", value: "1440" },
  { label: "1080p", value: "1080" },
  { label: "720p", value: "720" },
  { label: "480p", value: "480" },
];
const compressFpsOptions: Array<{ label: string; value: MotionSettings["compressFps"] }> = [
  { label: "Original", value: "source" },
  { label: "60 FPS", value: "60" },
  { label: "30 FPS", value: "30" },
];
const compressAudioRates: MotionSettings["compressAudioBitrate"][] = [96, 128, 160, 192, 256, 320];
const moduleCopy: Record<JobMode, { eyebrow: string; title: string; description: string }> = {
  motion: {
    eyebrow: "Smoothing",
    title: "Motion Blur",
    description: "Choose a look, then export a smoother copy.",
  },
  trim: {
    eyebrow: "Cutting",
    title: "Visual Trim",
    description: "Keep one range or multiple marked segments.",
  },
  compress: {
    eyebrow: "File size",
    title: "Compress",
    description: "Balance quality, upload size, and encode speed.",
  },
  discord: {
    eyebrow: "Preset export",
    title: "Discord 8 MB",
    description: "Creates a small upload-ready copy automatically.",
  },
  youtube: {
    eyebrow: "Preset export",
    title: "YouTube 4K",
    description: "Creates a 2160p upload copy automatically.",
  },
  tiktok: {
    eyebrow: "Preset export",
    title: "TikTok Quality",
    description: "Applies the 1:1 quality patch for uploads.",
  },
};

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
  onDeletePreset,
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
      <div className="flex h-9 shrink-0 items-center border-b border-border/70 px-3">
        <h2 className="text-sm font-semibold text-foreground">
          Adjustments
        </h2>
      </div>
      <div className="xype-scrollbar min-h-0 flex-1 overflow-auto p-3">
        <ModuleHeader mode={mode} settings={settings} />
        {mode === "motion" ? (
          <div className="mt-3 space-y-4">
            <PanelGroup
              description="Start with a look. You can still adjust every value below."
              title="Look"
            >
              <div className="grid w-full grid-cols-3 gap-2">
                {presets.map((item) => (
                  <Button
                    className="w-full px-1"
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
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <UserPresetMenu onChange={onChange} onDelete={onDeletePreset} userPresets={userPresets} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="px-3" type="button" variant="outline">
                      Presets
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup>
                      <DropdownMenuRadioItem onClick={onSavePreset} value="save">
                        Save current
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem onClick={onImportPreset} value="import">
                        Import .vro
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem onClick={onExportPreset} value="export">
                        Export .vro
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </PanelGroup>

            <MotionQueuePanel
              files={motionQueueFiles}
              onAddFiles={onAddMotionFiles}
              onRemoveFile={onRemoveMotionFile}
              onRunFiles={onRunMotionFiles}
            />

            <PanelGroup
              description="The only settings most clips need."
              title="Simple controls"
            >
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

            <MotionAdvancedSettings
              encoderSupport={encoderSupport}
              onChange={update}
              settings={settings}
            />
          </div>
        ) : mode === "compress" ? (
          <div className="mt-3">
            <CompressSettingsPanel settings={settings} update={update} />
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <ModuleSummary mode={mode} settings={settings} />
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

function CompressSettingsPanel({
  settings,
  update,
}: {
  settings: MotionSettings;
  update: (next: Partial<MotionSettings>) => void;
}) {
  const estimatedOutput = [
    compressHeights.find((item) => item.value === settings.compressMaxHeight)?.label,
    compressFpsOptions.find((item) => item.value === settings.compressFps)?.label,
    `${settings.compressAudioBitrate} kbps audio`,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="space-y-4">
      <PanelGroup title="Compress">
        <ButtonGrid
          label="Goal"
          onChange={(compressMode) => {
            const crf = compressMode === "small" ? 28 : compressMode === "high" ? 18 : 23;
            update({ compressMode, compressCrf: crf });
          }}
          options={compressModes}
          value={settings.compressMode}
        />
        <SliderField
          label="Quality"
          max={32}
          min={16}
          onChange={(compressCrf) => update({ compressCrf: Math.round(compressCrf) })}
          step={1}
          value={settings.compressCrf}
        />
        <p className="text-[11px] leading-4 text-white/35">
          Lower quality number keeps more detail. Higher number makes a smaller file.
        </p>
      </PanelGroup>

      <PanelGroup title="Video">
        <SelectField
          label="Size limit"
          onChange={(compressMaxHeight) => update({ compressMaxHeight })}
          options={compressHeights.map((item) => item.value)}
          renderLabel={(value) => compressHeights.find((item) => item.value === value)?.label ?? value}
          value={settings.compressMaxHeight}
        />
        <SelectField
          label="Frame rate"
          onChange={(compressFps) => update({ compressFps })}
          options={compressFpsOptions.map((item) => item.value)}
          renderLabel={(value) => compressFpsOptions.find((item) => item.value === value)?.label ?? value}
          value={settings.compressFps}
        />
        <SelectField
          label="Encode speed"
          onChange={(compressPreset) => update({ compressPreset })}
          options={["veryfast", "fast", "medium", "slow"]}
          renderLabel={(value) => ({
            veryfast: "Fastest",
            fast: "Fast",
            medium: "Normal",
            slow: "Smaller file",
          })[value]}
          value={settings.compressPreset}
        />
      </PanelGroup>

      <PanelGroup title="Audio">
        <SelectField
          label="Bitrate"
          onChange={(value) =>
            update({ compressAudioBitrate: Number(value) as MotionSettings["compressAudioBitrate"] })
          }
          options={compressAudioRates.map(String)}
          renderLabel={(value) => `${value} kbps`}
          value={String(settings.compressAudioBitrate)}
        />
        <ToggleRow
          checked={settings.compressFastStart}
          label="Web playback"
          onCheckedChange={(compressFastStart) => update({ compressFastStart })}
        />
        <p className="truncate text-[11px] text-white/35">{estimatedOutput}</p>
      </PanelGroup>
    </div>
  );
}

function MotionAdvancedSettings({
  encoderSupport,
  onChange,
  settings,
}: {
  encoderSupport: EncoderSupport | null;
  onChange: (next: Partial<MotionSettings>) => void;
  settings: MotionSettings;
}) {
  return (
    <div className="space-y-4">
      <PanelGroup title="Frame blending">
        <ToggleRow
          checked={settings.frameBlendingEnabled}
          label="Blend frames"
          onCheckedChange={(frameBlendingEnabled) => onChange({ frameBlendingEnabled })}
        />
        <ButtonGrid
          label="Weighting"
          options={weightings.map((value) => ({ label: weightingLabels[value], value }))}
          onChange={(blendWeighting) => onChange({ blendWeighting })}
          value={settings.blendWeighting}
        />
      </PanelGroup>

      <PanelGroup title="Interpolation">
        <ToggleRow
          checked={settings.interpolationEnabled}
          label="Generate in-between frames"
          onCheckedChange={(interpolationEnabled) => onChange({ interpolationEnabled })}
        />
        <NumberField
          label="Interpolated FPS"
          min={60}
          onChange={(interpolateFps) => onChange({ interpolateFps })}
          value={settings.interpolateFps}
        />
        <SelectField
          label="Speed"
          onChange={(interpolationSpeed) => onChange({ interpolationSpeed })}
          options={interpolationSpeeds}
          value={settings.interpolationSpeed}
        />
        <SelectField
          label="Tuning"
          onChange={(interpolationTuning) => onChange({ interpolationTuning })}
          options={interpolationTunings}
          value={settings.interpolationTuning}
        />
        <SelectField
          label="Algorithm"
          onChange={(value) =>
            onChange({ interpolationAlgorithm: Number(value) as MotionSettings["interpolationAlgorithm"] })
          }
          options={interpolationAlgorithms.map(String)}
          value={String(settings.interpolationAlgorithm)}
        />
        <ToggleRow
          checked={settings.interpolationGpu}
          label="Use GPU"
          onCheckedChange={(interpolationGpu) => onChange({ interpolationGpu })}
        />
      </PanelGroup>

      <PanelGroup title="Flowblur">
        <ToggleRow
          checked={settings.flowblurEnabled}
          label="RSMB-style blur"
          onCheckedChange={(flowblurEnabled) => onChange({ flowblurEnabled })}
        />
        <SliderField
          label="Amount"
          max={200}
          min={0}
          onChange={(flowblurAmount) => onChange({ flowblurAmount: Math.round(flowblurAmount) })}
          step={1}
          value={settings.flowblurAmount}
        />
      </PanelGroup>

      <PanelGroup title="Output">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Quality"
            max={35}
            min={1}
            onChange={(crf) => onChange({ crf })}
            value={settings.crf}
          />
          <NumberField
            label="Speed"
            min={0.25}
            onChange={(timescale) => onChange({ timescale })}
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
          onChange={(encoder) => onChange({ encoder })}
          value={settings.encoder}
        />
        {encoderSupport?.h264Nvenc === false && (
          <p className="text-[11px] leading-4 text-white/35">
            NVIDIA encoding is unavailable. CPU encoding will be used.
          </p>
        )}
      </PanelGroup>
    </div>
  );
}

function ModuleHeader({ mode, settings }: { mode: JobMode; settings: MotionSettings }) {
  const copy = moduleCopy[mode];
  const metrics = modeMetrics(mode, settings);

  return (
    <section className="rounded-lg border border-border/70 bg-muted/25 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">{copy.eyebrow}</p>
      <h3 className="mt-1 text-base font-semibold text-foreground">{copy.title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.description}</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {metrics.map((metric) => (
          <div
            className="rounded-md border border-border/60 bg-background/55 px-2.5 py-2"
            key={metric.label}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{metric.label}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-foreground/80">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModuleSummary({ mode, settings }: { mode: Exclude<JobMode, "motion" | "compress">; settings: MotionSettings }) {
  if (mode === "trim") {
    const segments = settings.trimSegments.length || 1;
    const duration = settings.trimSegments.length
      ? settings.trimSegments.reduce((sum, segment) => sum + Math.max(0, segment.end - segment.start), 0)
      : Math.max(0, settings.trimEnd - settings.trimStart);

    return (
      <PanelGroup description="Use the viewer to mark ranges. Keyboard shortcuts stay active while trimming." title="Segments">
        <div className="grid grid-cols-2 gap-2">
          <SummaryCell label="Pieces" value={String(segments)} />
          <SummaryCell label="Length" value={formatSeconds(duration)} />
        </div>
      </PanelGroup>
    );
  }

  const details: Record<Exclude<JobMode, "motion" | "trim" | "compress">, Array<{ label: string; value: string }>> = {
    discord: [
      { label: "Target", value: "8 MB" },
      { label: "Format", value: "MP4" },
    ],
    youtube: [
      { label: "Size", value: "2160p" },
      { label: "Format", value: "MP4" },
    ],
    tiktok: [
      { label: "Method", value: "1:1 patch" },
      { label: "Format", value: "H.264 MP4" },
    ],
  };

  return (
    <PanelGroup description="This module uses xype defaults, so there are no required settings here." title="Export preset">
      <div className="grid grid-cols-2 gap-2">
        {details[mode].map((detail) => (
          <SummaryCell key={detail.label} label={detail.label} value={detail.value} />
        ))}
      </div>
    </PanelGroup>
  );
}

function UserPresetMenu({
  onChange,
  onDelete,
  userPresets,
}: {
  onChange: (settings: MotionSettings) => void;
  onDelete: (id: string) => void;
  userPresets: UserMotionPreset[];
}) {
  const [presetToDelete, setPresetToDelete] = useState<UserMotionPreset | null>(null);

  if (userPresets.length === 0) {
    return (
      <div className="flex h-7 items-center rounded-md border border-border bg-muted/30 px-2.5 text-xs font-medium text-muted-foreground">
        No saved presets
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full justify-between px-3" type="button" variant="outline">
            User presets
            <span className="text-white/35">{userPresets.length}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {userPresets.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={(event) => {
                if (event.shiftKey) {
                  event.preventDefault();
                  setPresetToDelete(item);
                  return;
                }
                onChange(item.settings);
              }}
            >
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="text-[10px] text-white/28">Shift delete</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={Boolean(presetToDelete)} onOpenChange={(open) => !open && setPresetToDelete(null)}>
        <AlertDialogContent className="border border-[var(--xype-border)] bg-[var(--xype-sheet)] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete preset?</AlertDialogTitle>
            <AlertDialogDescription>
              {presetToDelete ? `"${presetToDelete.name}" will be removed from saved presets.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (presetToDelete) onDelete(presetToDelete.id);
                setPresetToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/55 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-foreground/80">{value}</p>
    </div>
  );
}

function modeMetrics(mode: JobMode, settings: MotionSettings) {
  if (mode === "motion") {
    return [
      { label: "Output", value: `${settings.outputFps} FPS` },
      { label: "Blur", value: settings.frameBlendingEnabled ? `${settings.blurIntensity.toFixed(2)}x` : "Off" },
    ];
  }
  if (mode === "trim") {
    const duration = settings.trimSegments.length
      ? settings.trimSegments.reduce((sum, segment) => sum + Math.max(0, segment.end - segment.start), 0)
      : Math.max(0, settings.trimEnd - settings.trimStart);
    return [
      { label: "Pieces", value: String(settings.trimSegments.length || 1) },
      { label: "Length", value: formatSeconds(duration) },
    ];
  }
  if (mode === "compress") {
    return [
      { label: "Goal", value: compressModes.find((item) => item.value === settings.compressMode)?.label ?? "Balanced" },
      { label: "Quality", value: `CRF ${settings.compressCrf}` },
    ];
  }
  if (mode === "discord") return [{ label: "Target", value: "8 MB" }, { label: "Output", value: "Upload copy" }];
  if (mode === "youtube") return [{ label: "Size", value: "2160p" }, { label: "Output", value: "Upload copy" }];
  return [{ label: "Method", value: "1:1 patch" }, { label: "Output", value: "Upload copy" }];
}

function PanelGroup({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/70 bg-muted/25">
      <div>
        <div className="px-3 pb-2 pt-3">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="space-y-3 border-t border-border/70 p-3">{children}</div>
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
      <Label className="text-muted-foreground">{label}</Label>
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
      <div className="grid w-full grid-cols-2 gap-2">
        {options.map((option) => (
          <Button
            className="w-full px-2"
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full justify-between px-3" type="button" variant="outline">
            <span className="truncate">{renderLabel(value)}</span>
            <span className="text-muted-foreground">Change</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-lg border border-border bg-popover p-1 shadow-xl">
          <DropdownMenuRadioGroup value={value} onValueChange={(nextValue) => onChange(nextValue as TValue)}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {renderLabel(option)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
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
      <ButtonGroup className="grid w-full grid-cols-2">
        <Button onClick={onAddFiles} size="sm" type="button" variant="outline">
          Add clips
        </Button>
        <Button disabled={selectedFiles.length === 0} onClick={runSelected} size="sm" type="button">
          Render selected
        </Button>
      </ButtonGroup>
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
