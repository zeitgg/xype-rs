import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { BlurPreset, JobMode, MotionSettings } from "./types";

type Props = {
  mode: JobMode;
  onChange: (settings: MotionSettings) => void;
  onPresetChange: (preset: BlurPreset) => void;
  preset: BlurPreset;
  settings: MotionSettings;
};

const weightings: MotionSettings["blendWeighting"][] = ["equal", "gaussian", "pyramid", "vegas"];
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

export function MotionSettingsPanel({ mode, onChange, onPresetChange, preset, settings }: Props) {
  function update(next: Partial<MotionSettings>) {
    onChange({ ...settings, ...next });
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center border-b border-white/[0.075] px-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">
          Properties
        </h2>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <p className="mb-2 text-xs font-medium text-white/65">
          {mode === "motion" ? "How much smoother?" : "Output"}
        </p>
        {mode === "motion" ? (
          <div className="space-y-2">
            {presets.map((item) => (
              <button
                className={[
                  "w-full rounded-md border p-3 text-left transition-colors",
                  preset === item.id
                    ? "border-white/25 bg-white/[0.09]"
                    : "border-white/[0.075] bg-white/[0.025] hover:bg-white/[0.045]",
                ].join(" ")}
                key={item.id}
                onClick={() => onPresetChange(item.id)}
                type="button"
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs text-white/38">{item.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-white/[0.075] bg-white/[0.025] p-3">
            <p className="text-sm font-semibold">
          {mode === "trim" && "Trim clip"}
          {mode === "compress" && "Upload-ready compression"}
              {mode === "discord" && "Discord 8 MB copy"}
              {mode === "youtube" && "2160p YouTube copy"}
              {mode === "tiktok" && "TikTok FPS copy"}
            </p>
            <p className="mt-1 text-xs text-white/38">
              {mode === "trim"
                ? "Set the part of the video you want to keep."
                : "xype chooses practical settings automatically for this module."}
            </p>
            {mode === "trim" && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="Start"
                    min={0}
                    onChange={(trimStart) => update({ trimStart })}
                    step={0.1}
                    value={settings.trimStart}
                  />
                  <NumberField
                    label="End"
                    min={0.1}
                    onChange={(trimEnd) => update({ trimEnd })}
                    step={0.1}
                    value={settings.trimEnd}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    ["0-10s", 0, 10],
                    ["0-30s", 0, 30],
                    ["30-60s", 30, 60],
                  ].map(([label, start, end]) => (
                    <Button
                      key={label}
                      onClick={() => update({ trimStart: Number(start), trimEnd: Number(end) })}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {mode === "motion" && <details className="mt-3 rounded-md border border-white/[0.075] bg-black/10 p-3">
        <summary className="cursor-pointer text-xs font-medium text-white/55">
          Fine tune (optional)
        </summary>
        <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Generated frames"
            min={60}
            onChange={(interpolateFps) => update({ interpolateFps })}
            value={settings.interpolateFps}
          />
          <NumberField
            label="Output FPS"
            min={24}
            onChange={(outputFps) => update({ outputFps })}
            value={settings.outputFps}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Blur amount</Label>
            <span className="text-xs text-white/35">{settings.framesToBlend}/24</span>
          </div>
          <Slider
            max={24}
            min={1}
            onValueChange={([framesToBlend]) => update({ framesToBlend })}
            step={1}
            value={[settings.framesToBlend]}
          />
        </div>

        <div className="space-y-2">
          <Label>Blend style</Label>
          <div className="grid grid-cols-4 gap-1">
            {weightings.map((weighting) => (
              <Button
                key={weighting}
                className="px-1"
                onClick={() => update({ blendWeighting: weighting })}
                size="sm"
                type="button"
                variant={settings.blendWeighting === weighting ? "default" : "outline"}
              >
                {weightingLabels[weighting]}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="File quality"
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

        <div className="space-y-2">
          <Label>Encoder</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => update({ encoder: "libx264" })}
              size="sm"
              type="button"
              variant={settings.encoder === "libx264" ? "default" : "outline"}
            >
              Most PCs
            </Button>
            <Button
              onClick={() => update({ encoder: "h264_nvenc" })}
              size="sm"
              type="button"
              variant={settings.encoder === "h264_nvenc" ? "default" : "outline"}
            >
              NVIDIA
            </Button>
          </div>
        </div>
      </div>
      </details>}
      </div>
    </section>
  );
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
      <Label>{label}</Label>
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
