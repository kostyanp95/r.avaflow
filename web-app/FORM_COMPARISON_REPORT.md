# DETAILED COMPARISON REPORT: Original r.avaflow Form vs. Our Web App

## 1. ORIGINAL SITE FORM ORGANIZATION

The original at `https://www.landslidemodels.org/r.avaflow/direct.php` is organized into **7 collapsible sections**, with two toggle-dimensions:

- **Environment toggle**: Windows (4.0W) vs GRASS/Linux (4.0G) -- CSS classes `.xwin` / `.xgra`
- **Phase toggle**: Single-phase (1) vs Multi-phase (3) -- CSS classes `.xsing` / `.xmult` / `.xmultc`

**Sections:**
1. Simulation Management
2. Elevation and Landslide Release
3. Landslide Material
4. Entrainment and Stopping
5. Phase Transformation
6. Reference Information and Output Controls
7. Parameters for Visualization

## 2. OUR WEB APP FORM ORGANIZATION

5-step wizard:
- Step 0: Project Setup (name, prefix, cellsize, phases)
- Step 1: Raster Files (elevation, hrelease1-3, hentrmax1-3, impactarea)
- Step 2: Materials (density, friction 3x3 table, cohesion, viscosity)
- Step 3: Advanced (tint, tend, entrainment coefficient, stopping threshold)
- Step 4: Review & Run

---

## 3. FIELDS PRESENT ON ORIGINAL BUT MISSING FROM OUR FORM

### A. Simulation Management (our Step 0 partial coverage)

| Original Field | Type | Default | Notes |
|---|---|---|---|
| `flag m` | checkbox | unchecked | Multiple model runs / sensitivity analysis |
| `sampling` | integer | random | Sampling strategy for multiple runs |
| `cores` | integer | 8 | Number of processor cores |
| `aoicoords` | list | - | Area of interest coordinates (N,S,W,E) |
| `ctopo` | radio | 0 | Vertical (0) vs topography-following (1) heights |
| `limiter` | select | minmod | Numerical limiter: minmod, superbee, woodward, van leer |
| `thresholds` | list | 0.1,10000,10000,1.0,0.000001 | 5 display/simulation threshold values |
| `slomo` | list | 1.0,1.0,1.0 | Slow-flow time scaling + viscosity/flux controllers |
| `cfl` | list | 0.4,0.001 | CFL criterion + alternative timestep |
| `gravity` | float | 9.81 | Gravitational acceleration (m/s^2) |

### B. Elevation and Release (our Step 1 partial coverage)

| Original Field | Type | Default | Notes |
|---|---|---|---|
| `rhrelease1` | float | - | Ratio of P1 release height (0-1 fraction) |
| `vhrelease` | list | - | Variation of release height (randomization) |
| `trelease` | raster | - | Release start time raster (seconds) |
| `trelstop` | raster | - | Release stop time raster (continuous extrusion) |
| `hydrograph` | text | - | Input hydrograph text file(s) |
| `hydrocoords` | list | - | Coordinates/length/direction of hydrograph profiles |
| `vinx1` | raster | - | Release velocity P1 in x direction |
| `viny1` | raster | - | Release velocity P1 in y direction |
| `vinx2` | raster | - | Release velocity P2 in x direction |
| `viny2` | raster | - | Release velocity P2 in y direction |
| `vinx3` | raster | - | Release velocity P3 in x direction |
| `viny3` | raster | - | Release velocity P3 in y direction |

### C. Landslide Material (our Step 2 partial coverage)

| Original Field | Type | Default | Notes |
|---|---|---|---|
| `clayers` | radio | 0 | Layer mode control (layered phase structure) |
| `cdispersion` | radio | 0 | Dispersion control |
| `csurface` | radio | 0 | Surface control (0=none, 1=edges, 2=within, 3=both) |
| `deformation` | list | 1.0,1.0,1.0 | Deformation coefficients per phase |
| `slidepar` | list | 0.0,0.0,0.0,0.0,0.0,0.0 | Block sliding model parameters |
| `shearing` | list | 0.0 | Energy loss through shearing |
| `fragmentation` | list | 0.0,0.0 | Fragmentation parameters |
| `ambient` | list | 0.0 | Ambient drag coefficient (air resistance) |
| `drag` | list | 1,3,1,0.1,1,1 | Inter-phase drag (6 parameters) |
| `virtualmass` | list | 10,0.12,1 | Virtual mass (3 parameters) |
| `phi1`-`phi3` | raster | - | Spatially-varying internal friction per phase |
| `delta1`-`delta3` | raster | - | Spatially-varying basal friction per phase |
| `addfri1`-`addfri3` | raster | - | Additional friction parameter rasters |
| `coh1`-`coh3` | raster | - | Spatially-varying cohesion rasters |
| `ny1`-`ny3` | raster | - | Spatially-varying viscosity rasters |
| `cdeform` | raster | - | Spatially-varying deformation coefficient |
| `zfrag` | raster | - | Fragmentation zones raster |
| `ambdrag` | raster | - | Spatially-varying ambient drag raster |
| `frictiograph` | text | - | Time-varying friction/viscosity file |
| `tslide` | raster | - | Time of initial sliding raster |

### D. Entrainment and Stopping (our Step 3 partial coverage)

| Original Field | Type | Default | Notes |
|---|---|---|---|
| `centrainment` | radio | 0 | Entrainment control (0=off, 1=momentum-based) |
| `cstopping` | radio | 0 | Stopping control (0=off, 1=KE ratio, 2=momentum, 3=pressure) |
| `rhentrmax1` | float | - | Ratio of max P1 entrainment height |
| `vhentrmax` | list | - | Variation of max entrainment height |
| `centr` | raster | - | Spatially-varying entrainment coefficient raster |
| `tstop` | raster | - | Stopping time raster |

**Note:** Our form has `entrainment` as a 0-1 float, but the original uses log10 values (default `-7.0`) combined with a `centrainment` on/off control. This is a semantic mismatch.

### E. Phase Transformation (ENTIRELY MISSING section)

| Original Field | Type | Default | Notes |
|---|---|---|---|
| `cmelt` | radio | 0 | Temperature evolution / ice melting control |
| `transformation` | list | 0.0,0.0,0.0 | Phase transformation coefficients (log10) |
| `melting` | list | 0.0,0.0,0.0,0.2,0.5 | Ice melting: temps + efficiency + sliding fraction |
| `ctrans12` | raster | - | P1-P2 transformation coefficient raster |
| `ctrans13` | raster | - | P1-P3 transformation coefficient raster |
| `ctrans23` | raster | - | P2-P3 transformation coefficient raster |
| `transformograph` | text | - | Time-varying transformation file |

### F. Reference Information and Output Controls (mostly missing)

| Original Field | Type | Default | Notes |
|---|---|---|---|
| `hdeposit` | raster | - | Observed deposit height raster (validation) |
| `zones` | raster | - | Zones raster (per-zone statistics) |
| `profile` | list | - | Profile vertices coordinates |
| `ctrlpoints` | list | - | Control point coordinates |
| `flag k` | checkbox | unchecked | Keep result GRASS raster maps |
| `flag a` | checkbox | unchecked | Produce velocity/pressure/KE rasters |
| `flag t` | checkbox | unchecked | Produce tsunami height rasters |
| `flag v` | checkbox | checked | Generate visualizations/animations |

### G. Visualization (ENTIRELY MISSING section)

| Original Field | Type | Default | Notes |
|---|---|---|---|
| `pbgr` | text | - | Orthophoto red channel |
| `pbgg` | text | - | Orthophoto green channel |
| `pbgb` | text | - | Orthophoto blue channel |
| `visualization` | list | complex | 16 display parameters (Paraview/R/Blender/Unreal) |

### H. File Import (MISSING)

| Original Field | Type | Default | Notes |
|---|---|---|---|
| Parameter import | file upload | - | Import existing r.avaflow parameter file |

---

## 4. FIELDS WE HAVE THAT THE ORIGINAL DOESN'T

| Our Field | Notes |
|---|---|
| `name` (Project name) | We use this as a folder name; the original uses `prefix` + `indir` instead |

That is essentially the only field unique to our form. The original uses `indir` (directory path) instead, which is system-oriented rather than project-oriented. Our `name` concept is a valid abstraction for a web app.

---

## 5. DEFAULT VALUE DISCREPANCIES

| Parameter | Our Default | Original Default | Issue |
|---|---|---|---|
| density P1 | 2600 | 2700 | Ours is lower |
| density P2 | 1300 | 1800 | Significant difference |
| friction internal P1 | 35 | 40 | Different |
| friction fluid P1 | 3 | 0.0 | We default to 3, original to 0 |
| friction fluid P2 | 3 | 0.0 | Same issue |
| friction fluid P3 | 0 | 0.05 | Reversed |
| tend (end time) | 120 | 300 | Different |
| entrainment | null (0-1 range) | -7.0 (log10) | **Different scale entirely** |

The entrainment field is particularly problematic: the original uses log10 of the coefficient (e.g., `-7.0` meaning `10^-7`), while our form accepts a linear 0-1 value. These are incompatible representations.

---

## 6. CONDITIONAL LOGIC ON THE ORIGINAL

The original uses CSS class toggling for:
- **Single vs Multi-phase**: Hides all P2/P3 fields, drag, virtual mass, transformation, and dispersion when `phases=1`
- **Windows vs GRASS**: Hides/shows `indir`, `cellsize`, `aoicoords`, and changes the output format (`.sh` vs `.cmd`)
- **Implicit conditionals**: `centrainment=0` means entrainment parameters are ignored; `cstopping=0` means stopping is disabled; `cmelt=0` disables melting parameters

Our form has none of this conditional logic -- we always show 3-phase fields and have no enable/disable toggles for subsystems.

---

## 7. RECOMMENDED RESTRUCTURING

Based on the analysis, I suggest reorganizing into 7 steps (matching the original's logical grouping but adapted for a wizard UX):

**Step 1 - Project & Simulation Setup** (merge of our Step 0 + missing Simulation Management fields)
- Project name, prefix, cellsize
- phases (1 or 3 selector, not hardcoded)
- ctopo (vertical vs topography-following)
- limiter (select: minmod/superbee/woodward/van leer)
- gravity
- thresholds (collapsible/advanced subsection)
- cfl (collapsible/advanced subsection)
- slomo (collapsible/advanced subsection)
- cores

**Step 2 - Terrain & Release** (expanded Step 1)
- elevation (required)
- hrelease1-3 (conditional on phases)
- rhrelease1 (if applicable)
- trelease, trelstop (time-controlled release)
- vinx1-3, viny1-3 (initial velocities)
- hydrograph, hydrocoords

**Step 3 - Materials** (expanded Step 2)
- density (per phase)
- friction table (internal/basal/fluid x phases)
- cohesion (per phase)
- viscosity (per phase)
- deformation (per phase)
- Advanced material subsection (collapsible):
  - clayers, cdispersion, csurface
  - drag, virtualmass
  - slidepar, shearing, fragmentation, ambient
- Spatial raster overrides subsection (collapsible):
  - phi1-3, delta1-3, addfri1-3, coh1-3, ny1-3, cdeform, zfrag, ambdrag
  - frictiograph, tslide

**Step 4 - Entrainment, Stopping & Transformation**
- centrainment toggle (on/off)
- entrainment coefficient (log10, not linear!)
- cstopping selector (off/KE/momentum/pressure) + stopping threshold
- hentrmax1-3 (moved here from Step 1, logically grouped)
- centr, tstop (spatial overrides)
- Phase transformation subsection:
  - transformation coefficients
  - cmelt toggle + melting parameters
  - ctrans rasters + transformograph

**Step 5 - Output & Timing**
- time (tint, tend)
- flag k (keep rasters)
- flag a (velocity/pressure maps)
- flag t (tsunami maps)
- flag v (visualization)
- impactarea, hdeposit, zones
- profile, ctrlpoints

**Step 6 - Visualization** (optional/collapsible)
- pbgr, pbgg, pbgb (orthophoto channels)
- visualization display parameters

**Step 7 - Review & Run**
- Summary of all configured parameters
- Generated script preview
- Save / Run buttons

---

## 8. SUMMARY STATISTICS

| Metric | Original | Our Form | Gap |
|---|---|---|---|
| Total unique parameters | ~85+ | ~22 | **~63 missing** |
| Raster input fields | ~30 | 8 | 22 missing |
| Numeric/list parameters | ~25 | 12 | 13 missing |
| Toggle/control flags | ~10 | 0 | 10 missing |
| Checkbox flags | 4 | 0 | 4 missing |
| Select dropdowns | 1 (limiter) | 0 | 1 missing |
| Sections | 7 | 5 | Different organization |
| Entire missing sections | 2 (Phase Transformation, Visualization) | - | - |

## Key Files Examined

- `D:/r.avaflow.40G/r.avaflow/web-app/src/app/home/simulation-wizard/simulation-wizard.component.html` -- wizard form template
- `D:/r.avaflow.40G/r.avaflow/web-app/src/app/home/simulation-wizard/simulation-wizard.component.ts` -- wizard form logic + script generation
- `D:/r.avaflow.40G/r.avaflow/web-app/src/app/home/models/models.ts` -- TypeScript interfaces + defaults
- `D:/r.avaflow.40G/r.avaflow/web-app/server/src/app.service.ts` -- server-side script generation

## Critical Issues to Fix First

1. **Entrainment coefficient scale mismatch**: Our form uses 0-1 linear; original uses log10 (e.g., -7.0). This means our generated scripts produce wrong values.
2. **Missing `centrainment` and `cstopping` controls**: Without these toggle flags, the simulation may not activate entrainment/stopping at all even when coefficients are set.
3. **Hardcoded `phases=s,fs,f`**: Should support single-phase (phases=1) for simpler scenarios.
4. **Default value discrepancies**: density P2 (1300 vs 1800), friction values differ from the official defaults.
5. **Cohesion is present in our form but NOT emitted in the script** -- the `createExperiment()` in the server and `generateScriptPreview()` in the client both omit the `cohesion=` parameter from the generated command line.

---

## Complete Parameter Reference from Original (60+ parameters)

### Simulation Management

| Parameter | Default | Type | Count | Description |
|---|---|---|---|---|
| `prefix` | (required) | string | 1 | Output file prefix, no spaces/special chars |
| `indir` | (required) | path | 1 | Input data directory with trailing slash |
| `flag m` | 0 | flag | 1 | Enable multiple model runs |
| `sampling` | 100 | integer | 1 | Strategy for multiple runs |
| `cores` | 8 | integer | 1 | Number of processors for parallel execution |
| `cellsize` | (from elevation) | float | 1 | Raster cell size in meters |
| `aoicoords` | (from elevation) | list | 4 | Bounding box N,S,W,E |
| `ctopo` | 0 | integer | 1 | 0=flow height, 1=velocity direction control |
| `phases` | 1 | integer | 1 | 1=single-phase, 3=multi-phase |
| `limiter` | varies | integer | 1 | 0=Minmod, 1=Superbee, 2=Woodward, 3=Van Leer |
| `thresholds` | 0.1,10000,10000,1.0,0.000001 | list | 5 | Display/simulation thresholds (m,J,Pa,m,m) |
| `time` | 10,300 | list | 2 | Output interval, end time (seconds) |
| `slomo` | 1.0,1.0,1.0 | list | 3 | Time scaling, viscosity controller, flux controller |
| `cfl` | 0.4,0.001 | list | 2 | CFL criterion (max 0.5), alternative timestep |
| `gravity` | 9.81 | float | 1 | Gravitational acceleration (m/s^2) |

### Elevation and Release

| Parameter | Default | Type | Count | Description |
|---|---|---|---|---|
| `elevation` | (required) | raster | 1 | Elevation map (m a.s.l.) |
| `hrelease1` | (optional) | raster | 1 | Phase 1 release height (m) |
| `hrelease2` | (optional) | raster | 1 | Phase 2 release height (m) |
| `hrelease3` | (optional) | raster | 1 | Phase 3 release height (m) |
| `rhrelease1` | (optional) | float | 1 | P1 release height ratio (0-1) |
| `vhrelease` | (optional) | list | 2-3 | Release height randomization bounds |
| `trelease` | (optional) | raster | 1 | Release start time (s) |
| `trelstop` | (optional) | raster | 1 | Release stop/continuous extrusion time (s) |
| `hydrograph` | (optional) | file(s) | N | Input discharge/velocity text files |
| `hydrocoords` | (optional) | list | 4*N | Hydrograph profile coords + directions |
| `vinx1`/`viny1` | (optional) | raster | 1 each | Phase 1 initial x/y velocity (m/s) |
| `vinx2`/`viny2` | (optional) | raster | 1 each | Phase 2 initial x/y velocity (m/s) |
| `vinx3`/`viny3` | (optional) | raster | 1 each | Phase 3 initial x/y velocity (m/s) |

### Material Properties

| Parameter | Default | Type | Count | Description |
|---|---|---|---|---|
| `clayers` | 0 | integer | 1 | 0=off, 1=layer mode |
| `cdispersion` | 0 | integer | 1 | 0=off, 1=dispersion active |
| `csurface` | 0 | integer | 1 | 0=no force balancing, 1=reservoir edges, 2=within reservoir, 3=both |
| `density` | 2700,1800,1000 | list | 3 | Phase densities (kg/m^3) |
| `friction` | 40,20,0,20,10,0,0.0,0.0,0.05 | list | 9 | See breakdown below |
| `cohesion` | 0.0,0.0,0.0 | list | 3 | Cohesion per phase (N/m^2) |
| `viscosity` | 0.0,0.0,0.0 | list | 3 | Kinematic viscosity per phase (log10 m^2/s) |
| `deformation` | 1.0,1.0,1.0 | list | 3 | Deformation coefficients (0-1) |
| `slidepar` | 0.0,0.0,0.0,0.0,0.0,0.0 | list | 6 | See breakdown below |
| `shearing` | 0.0 | list | 1 | Energy loss through shearing |
| `fragmentation` | 0.0,0.0 | list | 2 | Fragmentation parameters |
| `ambient` | 0.0 | list | 1 | Air resistance coefficient |
| `drag` | 1,3,1,0.1,1,1 | list | 6 | See breakdown below |
| `virtualmass` | 10,0.12,1 | list | 3 | Nvm, lvm, nvm coefficients |

**Friction breakdown (9 values):**
1. phi1 -- P1 internal friction angle (degrees)
2. phi2 -- P2 internal friction angle (degrees)
3. phi3 -- P3 internal friction angle (degrees)
4. delta1 -- P1 basal friction angle (degrees)
5. delta2 -- P2 basal friction angle (degrees)
6. delta3 -- P3 basal friction angle (degrees)
7. addfri1 -- P1 fluid friction (+) or turbulent friction (-)
8. addfri2 -- P2 fluid friction (+) or turbulent friction (-)
9. addfri3 -- P3 fluid friction (+) or turbulent friction (-)

**Drag breakdown (6 values):**
1. KDrag -- mass flux parameter (default 1 m/s)
2. mDrag -- exponent for fluid-like drag (default 3)
3. nDrag -- exponent scaling with solid fraction (default 1)
4. Ut -- terminal velocity (default 0.1 m/s)
5. Rep -- particle Reynolds number (default 1)
6. j -- drag exponent, 1=linear, 2=quadratic (default 1)

**Slidepar breakdown (6 values):**
1-3. exp1,exp2,exp3 -- exponents for evolution of sliding component per phase (0=constant, 1=linear decrease, 2=rapid decrease)
4-6. frac1,frac2,frac3 -- initial fraction of block sliding per phase (0-1)

### Spatial Parameter Map Overrides (all optional rasters)

`phi1`, `phi2`, `phi3`, `delta1`, `delta2`, `delta3`, `addfri1`, `addfri2`, `addfri3`, `coh1`, `coh2`, `coh3`, `ny1`, `ny2`, `ny3`, `cdeform`, `zfrag`, `ambdrag`, `frictiograph` (file), `tslide`

### Entrainment and Stopping

| Parameter | Default | Type | Count | Description |
|---|---|---|---|---|
| `centrainment` | 0 | integer | 1 | 0=off, 1=active |
| `cstopping` | 0 | integer | 1 | 0=off, 1=kinetic energy, 2=momentum, 3=dynamic pressure |
| `entrainment` | -7.0,0.0 | list | 2 | Entrainment coefficient (log10), stopping threshold |
| `hentrmax1`/`2`/`3` | (optional) | raster | 1 each | Max entrainment height per phase (m) |
| `rhentrmax1` | (optional) | float | 1 | P1 entrainment height ratio (0-1) |
| `vhentrmax` | (optional) | list | 2-3 | Entrainment height randomization |
| `centr` | (optional) | raster | 1 | Entrainment coefficient map (log10) |
| `tstop` | (optional) | raster | 1 | Stopping time map (supports negative values) |

### Phase Transformation

| Parameter | Default | Type | Count | Description |
|---|---|---|---|---|
| `cmelt` | 0 | integer | 1 | 0=off, 1=temperature/ice melting active |
| `transformation` | 0.0,0.0,0.0 | list | 3 | P1-P2, P1-P3, P2-P3 coefficients (log10, negative=reverse) |
| `melting` | 0.0,0.0,0.0,0.2,0.5 | list | 5 | T_landslide, T_atmos, T_ground (C), melt efficiency, slide fraction |
| `ctrans12`/`13`/`23` | (optional) | raster | 1 each | Transformation maps (log10) |
| `transformograph` | (optional) | file | 1 | Time-varying transformation file |

### Reference and Output Control

| Parameter | Default | Type | Count | Description |
|---|---|---|---|---|
| `impactarea` | (optional) | raster | 1 | Observed impact area reference |
| `hdeposit` | (optional) | raster | 1 | Observed deposit height reference (m) |
| `zones` | (optional) | raster | 1 | Zone classification map |
| `profile` | (optional) | list | N | Flow path profile coordinates |
| `ctrlpoints` | (optional) | list | N | Control point coordinates |
| `flag k` | 0 | flag | 1 | Keep GRASS raster maps |
| `flag a` | 0 | flag | 1 | Produce velocity/pressure/energy rasters |
| `flag t` | 0 | flag | 1 | Produce wave/tsunami height rasters |
| `flag v` | 1 | flag | 1 | Enable visualization (default ON) |

### Visualization (17 values)

| # | Name | Default | Description |
|---|---|---|---|
| 1 | deform | 0 | Orthophoto deformation: 0=off, 1=with destruction, 2=without |
| 2 | hflowmin | 0.1 | Minimum flow height display (m) |
| 3 | hflowref | 5.0 | Reference flow height (m) |
| 4 | htsunref | 5.0 | Reference tsunami height (m) |
| 5 | hcontmin | 1 | Min flow height contour (m) |
| 6 | hcontmax | 100 | Max flow height contour (m) |
| 7 | hcontint | 2000 | Flow height contour interval (m) |
| 8 | zcontmin | 100 | Min elevation contour (m) |
| 9 | zcontmax | -11000 | Max elevation contour (m) |
| 10 | zcontint | 9000 | Elevation contour interval (m) |
| 11 | pred | 100 | Red color weight (0-1, single-phase) |
| 12 | pgreen | 0.60 | Green color weight |
| 13 | pblue | 0.25 | Blue color weight |
| 14 | pexp | 0.15 | Transparency exponent |
| 15 | phexagg | 0.2 | Flow height exaggeration |
| 16 | pvpath | 1.0 | Path to pvpython executable |
| 17 | rscriptpath | path | Path to Rscript executable |

### Orthophoto (for visualization)

`pbgr`, `pbgg`, `pbgb` -- raster maps for red, green, blue channels of orthophoto overlay.
