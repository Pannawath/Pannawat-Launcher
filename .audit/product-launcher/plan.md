# Launcher quality pass

- [x] Read the Principles section of the poteto-mode skill.
- [x] Phase A. Define the done predicate, scope, and rigor.
- [x] Phase B. Design a sequence of small units and capture the baseline.
- [x] Phase C. For each unit, state the hypothesis, change the smallest thing, verify the real app, and keep or revert it.
- [x] Phase D. Record decisions in `decisions.tsv` as they happen.
- [ ] Phase E. Audit every explicit requirement against the current app and report verified and open items.
- [ ] Inventory all reachable pages, controls, keyboard paths, game and file operations, and backend boundaries.
- [ ] Check source-level accessibility, responsiveness, loading, empty, error, and modal states.
- [ ] Fix the highest-impact broken user journey first.
- [ ] Build and exercise each changed journey on the running desktop app.
- [ ] Repeat the audit against the final build and leave unresolved external or destructive flows open.

## Done predicate

Every primary launcher journey is reachable, has correct data and feedback, and works with mouse and keyboard at supported sizes. Game launch, profile management, mod discovery, and file operations are checked on isolated test data. Production build succeeds. No critical or high-impact defect remains in the inspected scope. Any environment-dependent flow is labeled untested.

## Scope and rigor

Inspect the desktop launcher, Minecraft Hub, Discover, instances, files and logs, mods, profiles, settings, game discovery and launch, Tauri commands, and packaging metadata. Use high rigor because the app launches external processes and changes local files. Keep runtime checks isolated from existing player data.

## Designed sequence

1. Capture the clean-tree baseline and current production build.
2. Map reachable UI and compare the rendered app with source behavior.
3. Fix state and navigation defects that block primary journeys.
4. Fix file and process boundaries that can affect unrelated data or games.
5. Improve keyboard access, focus, touch targets, responsive layout, and clear states.
6. Rebuild after each unit and retest that unit in the running desktop app.
7. Run the full product-inspector matrix and list anything still untested.

## Completed in this pass

- Added settings-store version state that was missing and caused a Home crash; wrapped the React root in a visible error boundary.
- Unified Home launch and mods with the active profile/offline username used by Minecraft Hub; version changes persist to profile.json.
- Restricted Force Out to the tracked Minecraft PID tree; startup cancellation and launch-failure status now return to idle.
- Removed undrained Java stdout/stderr pipes; Minecraft owns logs/latest.log.
- Validated profile/mod filenames and instance paths before filesystem actions; ZIP import skips archived profile.json and cleans up failed imports.
- Replaced the no-op import UI with the native ZIP picker and profile importer; .mrpack is clearly unsupported.
- Removed false Java/version marketing from game metadata; added focus rings and smaller window minimum/breakpoint behavior.
- Passed Vite build, cargo check, release build, and opened the release binary. Verified Home and Hub render; native import dialog opens and cancels.
- Created isolated `QA Disposable` profile and verified Modrinth search, compatible version picker, Fabric API download, badge count, mod toggle, file browser, and live profile target.
- Filtered Discover version results to the active Minecraft version and loader; the picker now labels compatible exact matches and no longer offers unrelated releases.
- Improved file and log loading failures so the UI clears stale content and shows the backend error instead of a misleading empty state.
- Replaced profile export/import browser alerts and hard-coded paths with native dialogs and inline status feedback; upgraded react-router-dom to 7.18.5 and cleared the two moderate production audit findings.

## Still open

- Release runtime now launches Minecraft 1.21.4 to a visible `MINECRAFT IS RUNNING` state; `FORCE QUIT` returned UI to `PLAY` and `java/javaw` process inspection confirmed no client process remained. JVM stdout/stderr are piped and the final diagnostic is emitted on early exit.
- Mod download, enable/disable, file browser listing, log filter fixture, profile creation, window settings, native Java picker, and real launch/Force Out were exercised. Profile management now uses native ZIP open/save dialogs with inline success/error status instead of hard-coded Desktop paths and blocking browser alerts. GUI mod/profile deletion and export still need a destructive-action runtime pass. QA profile was moved to `.audit/qa-disposable-profile` after testing.
- Full product-inspector pass and all Hub/Discover/error/empty states remain to be audited.
- 960x640 behavior and keyboard-only navigation were not verified in the desktop runtime.
- Release runtime verified the Window & Resolution panel at 960×640; controls remained visible and the inline confirmation reported `Window size set to 960 × 640`. Restored the user's 1280×800 setting. Accessibility tree exposes named navigation/actions, sliders, spin buttons, and modal close control; full OS-level keyboard traversal remains limited by the WebView accessibility bridge.
- Rebuilt and reopened the final release binary after dependency/UI changes; verified Universal launcher ↔ Minecraft Hub navigation and restored 1280×800 in the live app.
- Strengthened global `:focus-visible` styling with an important outline so keyboard focus remains visible even on controls using `focus:outline-none`; Vite build and diff check pass.
- Added visible, dismissible launch error banners to the Universal launcher for Minecraft and other games; failures no longer exist only in the developer console. Build and diff check pass.
- `cargo test --no-run` now compiles all launcher, main, and direct-launch test targets successfully (warnings only).
- Removed stale unused imports/variables and an unused download event type; `cargo check` is now warning-free apart from the workspace profile notice, and Vite build still passes.
