# Agent Rules

## Behavior

- Be concise. Do not yap, over-explain, or pad responses.
- Save tokens. Prefer short, direct answers with only the context needed.
- Stay in scope. Do exactly what was asked and avoid unrelated refactors, experiments, or side quests.
- Do not start doing weird or surprising things. Ask only when a decision is genuinely risky or unknowable.
- Prefer action over long planning, but keep changes small and easy to review.
- Always mention verification performed, or clearly say what was not run.

## Code Quality

- Only produce clean, production-ready, maintainable code.
- Match existing project patterns before adding new abstractions.
- Keep code simple, typed, and readable.
- Do not add dependencies unless they are clearly justified.
- Do not leave dead code, debug logs, placeholder UI, TODO clutter, or half-finished features.
- Avoid broad rewrites when a focused change solves the problem.

## Frontend Rules

- This is an app UI, not a marketing website.
- Do not build landing pages, hero sections, promotional layouts, decorative sections, or website-like page structures unless explicitly requested.
- UI should be front-facing and understandable for normal users, not only power users.
- Keep interfaces compact, direct, and functional.
- Favor clear controls, labels, states, and feedback over decorative visuals.
- Avoid oversized typography, empty space, card-heavy marketing layouts, and ornamental gradients.
- Make common actions obvious without requiring the user to read instructions.
- Ensure responsive layouts remain usable and readable on small screens.

## Project Notes

- This is a Tauri 2 desktop app named `xype`.
- The frontend is React 19 + TypeScript with Vite.
- The native shell and commands live in `src-tauri` and are written in Rust.
- The repo uses Bun for JavaScript dependency locking (`bun.lock`).

## Commands

- Install dependencies with `bun install`.
- Run the web frontend with `bun run dev`.
- Build the frontend with `bun run build`.
- Run Tauri through `bun run tauri`.
- For Rust-only checks, run commands from `src-tauri`, for example `cargo check`.

## Safety

- Do not overwrite user changes.
- Do not run destructive git commands unless explicitly requested.
- Keep generated files, lockfile changes, and formatting changes scoped to the requested work.
