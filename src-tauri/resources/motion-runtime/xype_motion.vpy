import importlib.util
import json
import os
import sys
import types

import vapoursynth as vs
from vapoursynth import core

runtime_dir = os.path.dirname(__file__)
scripts_dir = os.path.join(runtime_dir, "scripts")


def _load_script(name):
    path = os.path.join(scripts_dir, name + ".py")
    if not os.path.exists(path):
        raise RuntimeError(f"Missing script: {path}. Please reinstall the motion engine.")
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


scripts_pkg = types.ModuleType("scripts")
scripts_pkg.__path__ = [scripts_dir]
sys.modules["scripts"] = scripts_pkg

scripts_pkg.consts = _load_script("consts")
scripts_pkg.weighting = _load_script("weighting")
sys.modules["scripts.consts"] = scripts_pkg.consts
sys.modules["scripts.weighting"] = scripts_pkg.weighting

blending = _load_script("blending")
havsfunc = _load_script("havsfunc")

YES = {"yes", "true", "on", "1", "y"}


def _yes(value):
    return str(value).lower() in YES


if "input_video" not in globals() or "recipe" not in globals():
    raise NameError("xype_motion.vpy requires input_video and recipe VSPipe arguments")

if isinstance(input_video, bytes):
    input_video = input_video.decode("utf-8")
if isinstance(recipe, bytes):
    recipe = recipe.decode("utf-8")

rc = json.loads(recipe)["data"]

source_plugin = rc["miscellaneous"].get("source plugin", "bestsource").lower()

def _source(path):
    if source_plugin in {"bs", "bestsource", "best source"} and hasattr(core, "bs"):
        return core.bs.VideoSource(path)
    if source_plugin in {"lsmas", "lsmash", "lwsmashsource"} and hasattr(core, "lsmas"):
        return core.lsmas.LWLibavSource(path)
    if hasattr(core, "ffms2"):
        return core.ffms2.Source(path)
    raise RuntimeError("No supported VapourSynth source plugin found")


def _normalize(clip):
    return core.resize.Bicubic(
        clip,
        format=vs.YUV420P8,
        matrix_in_s="709",
        transfer_in_s="709",
        primaries_in_s="709",
        matrix_s="709",
        transfer_s="709",
        primaries_s="709",
        range_in_s="limited",
        range_s="limited",
    )


source_clip = _normalize(_source(input_video))
clip = source_clip

in_scale = float(rc["timescale"].get("in", "1.0"))
if in_scale != 1.0:
    clip = core.std.AssumeFPS(clip, fpsnum=int(clip.fps / in_scale))

interpolation = rc["interpolation"]
if _yes(interpolation.get("enabled", "no")):
    target_fps_str = interpolation.get("fps", "360")
    if target_fps_str.endswith("x") or target_fps_str.startswith("x"):
        target_fps = int(target_fps_str.strip("x")) * clip.fps
    else:
        target_fps = float(target_fps_str)

    clip = havsfunc.InterFrame(
        Input=clip,
        GPU=interpolation.get("use gpu", "no").lower() in YES,
        Preset=interpolation.get("speed", "medium"),
        Tuning=interpolation.get("tuning", "weak"),
        NewNum=target_fps,
        NewDen=1,
        OverrideAlgo=int(interpolation.get("algorithm", "23")),
        OverrideBlockSize=interpolation.get("block size", "auto"),
        OverrideArea=None,
    )

flow = rc["flowblur"]
if _yes(flow.get("enabled", "no")):
    super_clip = core.mv.Super(clip, 16, 16, rfilter=3)
    bvec = core.mv.Analyse(super_clip, isb=True, blksize=16, plevel=2, dct=5)
    fvec = core.mv.Analyse(super_clip, blksize=16, plevel=2, dct=5)
    clip = core.mv.FlowBlur(clip, super_clip, bvec, fvec, blur=int(flow.get("amount", "125")))

blend = rc["frame blending"]
if _yes(blend.get("enabled", "no")):
    target_fps = float(blend.get("fps", "60"))
    input_fps = clip.fps_num / clip.fps_den
    if target_fps < input_fps + 1:
        weight_map = {
            "equal": "equal",
            "gaussian": "gaussian",
            "pyramid": "pyramid",
            "vegas": "ascending",
            "bright blend": "ascending",
            "heavy light": "descending",
        }
        raw_weighting = blend.get("weighting", "equal")
        if " " in str(raw_weighting) or "," in str(raw_weighting):
            blend["weighting"] = "divide"
            blend["weights"] = raw_weighting
        else:
            blend["weighting"] = weight_map.get(raw_weighting, "equal")

        blend.setdefault("bright blend", "no")
        weights = blending.parse_weights2(clip, blend)
        clip = blending.FrameBlend(clip, blend, False, weights=weights)
        clip = havsfunc.ChangeFPS(clip, int(target_fps))

out_scale = float(rc["timescale"].get("out", "1.0"))
if out_scale != 1.0:
    clip = core.std.AssumeFPS(clip, fpsnum=int(clip.fps * out_scale))

mask = rc.get("mask", {})
mask_path = mask.get("path", "")
if _yes(mask.get("enabled", "no")) and mask_path:
    if not hasattr(core, "imwri"):
        raise RuntimeError("Mask rendering requires the VapourSynth imwri image reader plugin.")
    if not os.path.exists(mask_path):
        raise RuntimeError(f"Mask PNG not found: {mask_path}")

    clean = source_clip
    if clean.fps_num != clip.fps_num or clean.fps_den != clip.fps_den:
        clean = havsfunc.ChangeFPS(clean, clip.fps_num / clip.fps_den)
    clean = clean[:len(clip)]

    mask_clip = core.imwri.Read(mask_path, alpha=False)
    mask_clip = core.std.Loop(mask_clip, times=len(clip))
    mask_clip = core.resize.Bicubic(
        mask_clip,
        width=clip.width,
        height=clip.height,
        format=vs.GRAY8,
        matrix_s="709",
        range_s="full",
    )
    clip = core.std.MaskedMerge(clean, clip, mask_clip)

clip.set_output()
