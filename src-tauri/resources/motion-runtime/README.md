# xype motion runtime

The app bundles `xype_motion.vpy` and installs the runtime binaries on demand.

Expected installed layout:

```txt
motion-runtime/
  vspipe.exe
  xype_motion.vpy
  scripts/
    havsfunc.py
    blending.py
    consts.py
    weighting.py
```

The installer downloads VapourSynth from VSBundler and Smoothie helper scripts.
