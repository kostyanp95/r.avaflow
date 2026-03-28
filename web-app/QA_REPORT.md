# QA Report: Modern UI Redesign (Simulation Wizard + Status + /run endpoint)

Date: 2026-03-04

## Bugs Found and Fixed

### BUG 1 (Critical): Backend `phases` parameter broken
**File:** `server/src/app.service.ts` line 125
**Problem:** `createExperiment` used `experiment.parameters.P1/P2/P3` to build the phases string, but the wizard sends `phases: 's,fs,f'` as a flat string. Result: `phases=undefined,undefined,undefined` in generated script.
**Fix:** Changed to use `experiment.parameters.phases` directly.

### BUG 2 (Critical): `tint`/`tend` nested under `time` object but destructured as flat
**File:** `simulation-wizard.component.ts` line 321-323
**Problem:** The wizard's `buildApiPayload` sent `time: { tint, tend }` but the backend destructured `tint` and `tend` at the top level of parameters. Both would be `undefined`.
**Fix:** Changed wizard to send `tint` and `tend` as flat properties (matching backend destructure).

### BUG 3: Typo `cellize` instead of `cellsize`
**Files:** `simulation-wizard.component.ts` line 285, `server/src/app.service.ts` line 100
**Problem:** Misspelled `cellize` in the API payload and backend destructure. The cellsize value would always be `undefined`.
**Fix:** Corrected to `cellsize` in both files.

### BUG 4 (Critical): Docker path double-nesting
**File:** `server/src/app.service.ts` line 209
**Problem:** Docker shell command was `cd /r.avaflow/projects/{name}/{name}` but the script is saved at `projects/{name}/{name}.sh` (one level). Docker would cd into a non-existent subdirectory.
**Fix:** Changed to `cd /r.avaflow/projects/${projectName}`.

### BUG 5: Upload path hardcoded to `TEST/DATA/`
**File:** `server/src/storage-options.ts`
**Problem:** Multer destination was hardcoded to `projects/TEST/DATA/`. All uploads went to the TEST project regardless of which project the user was working on. Generated scripts expect files in `DATA/` relative to the project folder.
**Fix:** Made destination dynamic — if `req.body.projectName` is provided, uploads go to `projects/{projectName}/DATA/`; otherwise to a shared `projects/uploads/` directory. Also updated `app.service.ts` to remove hardcoded TEST references.

### BUG 6: WebSocket listener leak in SimulationWizardComponent
**File:** `simulation-wizard.component.ts` lines 85-91
**Problem:** `this.ws.socket$.on('filesUploaded', ...)` registered a raw socket.io listener but never removed it in `ngOnDestroy`. Each time the component was created/destroyed, a new listener accumulated.
**Fix:** Stored the handler reference and added `socket$.off('filesUploaded', handler)` in `ngOnDestroy`.

### BUG 7: `createInitialCommands` crashes on null rasters
**File:** `server/src/app.service.ts` lines 42-95
**Problem:** The old code destructured `hrelease1`, `hentrmax1` etc. and unconditionally called `.slice(0, -4)` on them. The wizard sends `null` for unused rasters, causing `TypeError: Cannot read property 'slice' of null`.
**Fix:** Rewrote to conditionally emit import lines only for non-null rasters, using a helper function.

## Bugs Found but NOT Fixed

### ISSUE 1: Upload timing vs project creation
**Problem:** Users upload raster files in Step 1 (Raster Files), but the project name is only set in Step 0 and the project folder is not created until Save (Step 4). The dynamic upload path requires `projectName` in the upload request body, but `nz-upload` sends files to `http://localhost:3000/upload` without a projectName field. Files will fall back to `projects/uploads/` directory and won't be in the project's DATA/ folder when the simulation runs.
**Reason not fixed:** Requires architectural decision — either (a) create project folder on Step 0 completion and pass projectName with uploads, or (b) copy/move files from uploads/ to project DATA/ on save. This is a product decision.

### ISSUE 2: Hardcoded `localhost:3000` URLs
**Problem:** Both the wizard component and the upload action URL use `http://localhost:3000`. This won't work in production.
**Reason not fixed:** Expected for development stage; needs environment configuration.

### ISSUE 3: `phases` hardcoded to `s,fs,f`
**Problem:** The wizard hardcodes 3-phase mode. Per MEMORY.md, the 40G version requires `phases=3` not `phases=s,fs,f`. The old version uses `s,fs,f`.
**Reason not fixed:** Depends on which Docker image is targeted. Currently targets `r.avaflow:base` (old version) which uses `s,fs,f`. If 40G support is needed, this needs a toggle.

## DoD Checklist

- [x] Wizard renders with 5 steps (Project Setup, Raster Files, Materials, Advanced, Review & Run)
- [x] Next button blocked on invalid step (`[disabled]="!isCurrentStepValid"` uses `currentFormGroup.valid` which includes cross-field validators)
- [x] Save only calls POST /experiment
- [x] Save & Run calls POST /experiment then POST /run
- [x] Modeling tab shows log on simulationStarted (wizard emits event, home component switches tab, status component subscribes to WS)
- [x] Backend generates valid bash script (after fixes to createInitialCommands and createExperiment)
- [x] Docker spawn command correct (after path fix)
- [x] No TypeScript compilation errors visible in code (after cellsize typo fix)
- [x] CORS enabled on NestJS (`app.enableCors()` in main.ts, socket.io cors: `origin: '*'`)
- [x] HttpClientModule imported in AppModule (confirmed in app.module.ts line 29)
- [x] WebSocket listener properly cleaned up in ngOnDestroy (after fix)
- [x] Home component tab binding works (`[(nzSelectedIndex)]="selectedTabIndex"` with `onSimulationStarted` setting it to 1)

## Files Modified

1. `web-app/src/app/home/simulation-wizard/simulation-wizard.component.ts` — Fixed cellsize typo, flattened tint/tend in payload, added WS listener cleanup
2. `web-app/server/src/app.service.ts` — Fixed phases parameter, cellsize typo, null-safe raster imports, Docker path
3. `web-app/server/src/storage-options.ts` — Dynamic upload destination instead of hardcoded TEST/DATA
