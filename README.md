<div align="center">

# r.avaflow · Web Application

**Simulate avalanches, debris flows, landslides and lahars — from your browser.**

No terminal. No GRASS GIS setup. No Python, no R, no Docker commands to memorize.
Just open the app, click through a 7-step wizard, and let science happen.

[![License: GPL v2+](https://img.shields.io/badge/license-GPL--v2%2B-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html)
[![Angular](https://img.shields.io/badge/Angular-15.2-DD0031?logo=angular&logoColor=white)](https://angular.io)
[![NestJS](https://img.shields.io/badge/NestJS-9-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![OpenMP](https://img.shields.io/badge/OpenMP-multi--core-005A9C)](https://www.openmp.org)
[![GRASS GIS](https://img.shields.io/badge/GRASS%20GIS-8.4-0E9146)](https://grass.osgeo.org)
[![Status](https://img.shields.io/badge/status-beta-orange)]()

[🇷🇺 Русская версия](./README_ru.md) · [Report a bug](https://github.com/kostyanp95/r.avaflow/issues) · [r.avaflow core](https://www.landslidemodels.org/r.avaflow/)

</div>

---

## Why this project exists

[**r.avaflow**](https://www.landslidemodels.org/r.avaflow/) is a world-class, peer-reviewed simulation engine for gravitational mass flows — the physics behind avalanches, debris flows, landslides and lahars. It is developed by **Martin Mergili** and **Shiva P. Pudasaini** and cited in hundreds of publications.

It is also notoriously hard to set up. You need GRASS GIS, a matching Python runtime, R packages, a C compiler, GDAL, Pillow, the correct kernel headers, the right Docker base image, a friendly Linux terminal — and a few hours of patience.

**This project removes that barrier.**

A glaciology student, a geomorphologist, a risk assessor or an urban planner can now run a full multi-phase simulation without ever touching a shell. Everything — dependencies, GRASS GIS, R packages, the compiled C core, even the visualization pipeline — is packed into a single Docker image that exposes a friendly web UI.

> **Real-world validation.**
> - The web-app was used to model the **2017 Lake Bashkara GLOF** (Central Caucasus, Russia — 3 casualties, 4 km of destroyed roads, ~810 M ₽ in damages) — results published in a peer-reviewed paper in *Ice and Snow* (2024), see [Published research](#published-research) below. Co-authors of that study are the people who built this web-app.
> - In 2026, the catastrophic **2002 Kolka Glacier collapse** (Caucasus — 125 casualties, 19 km runout) was successfully reproduced in this web-app and became the basis for a **glaciology undergraduate thesis**.

---

## Who this is for

| You are… | You get… |
|---|---|
| A **glaciologist** studying ice-rock avalanches | Multi-phase Pudasaini–Mergili simulation with melting, cohesion and entrainment — configured through a form, not a command line |
| A **geomorphologist** modelling debris flows | Full `r.avaflow` parameter coverage (~85 knobs) with sane defaults, inline tooltips and validation |
| A **geotechnical engineer** running hazard assessments | Fast multi-core runs, reproducible projects, export-ready result bundles |
| An **urban planner / risk assessor** | Visual output (maps, GIF animations, ROC validation) without any GIS expertise |
| A **student or early researcher** | An on-ramp to a complex tool — you focus on the science, not on `apt-get` |

If your workflow today starts with *"Okay, first I SSH into the lab machine…"* — this replaces that step with a browser tab.

---

## What's inside

### A guided 7-step simulation wizard

Instead of a 400-line command invocation, you fill a form:

1. **Project setup** — phases, gravity, topography mode, CPU cores, CFL, thresholds
2. **Terrain & release** — DEM, release layers, hydrograph, timing
3. **Materials** — densities, friction, deformation, drag, virtual mass (per phase)
4. **Entrainment, stopping & phase transformation** — coefficient on log₁₀ scale, melting controls
5. **Output & timing** — what to save, time window, control points, profile lines
6. **Visualization** — orthophoto RGB, 17 display parameters for generated maps
7. **Review & run** — full summary + a preview of the actual `r.avaflow` script that will run

Every field has a tooltip with an **"Affects:"** line. Modified fields are highlighted in green so you always know what differs from the default. Two languages: **English** and **Русский**.

### Real-time simulation monitoring

- WebSocket log stream with ring buffer (no browser crashes on multi-hour runs)
- CPU and RAM gauges
- Cancel / re-run without leaving the page
- Progress bar tied to simulation time

### Built-in results viewer

- Image grid with click-to-zoom for PNG maps and GIF animations
- Per-project file browser (rasters, CSVs, logs, R plots)
- One-click ZIP export of an entire project
- R-generated visualization (ROC curves, hazard maps) included out-of-the-box

### Project management

- Create, load, rename, duplicate, delete projects from the sidebar
- Auto-detect cellsize from uploaded GeoTIFF — optional, with a confirmation modal
- Drag-and-drop raster upload
- All project data persists in a Docker volume

---

## The OpenMP story: **this core is faster now**

The stock `r.avaflow` computational core (`r.avaflow.main`, ~13 000 lines of C) was historically **single-threaded**. On a modern 12-core workstation, it used 1 core and let the other 11 sit idle, and a full debris-flow simulation took **tens of hours**.

**This project ships a parallelized core.** We added OpenMP directives to every hot numerical region of the NOC-TVD scheme — flux computation, source terms, phase transformations, CFL reduction, entrainment, stopping. All eight parallelizable regions are now `#pragma omp parallel for`.

The result, on a canonical production scenario (*Bashkara lake outburst, cellsize = 5 m, time window 60/1000*):

| Configuration | Runtime | Speedup |
|---|---:|:---:|
| Original single-threaded core | **~36 h** | 1.0× (baseline) |
| OpenMP on 12 cores (this release) | **~6 h** | **≈ 6×** |
| OpenMP on 16 cores | **~3 h** | **≈ 12×** |

On 16-core hardware `r.avaflow.main` reaches **≈ 810 % CPU utilization** — meaning 8 of 16 cores are fully saturated, against 100 % (one core) on the stock build. **A day-long simulation now finishes before lunch.**

Everything happens automatically — the web-app exposes a CPU slider that maps to `OMP_NUM_THREADS`, and the Docker image already contains `libgomp`. No recompilation, no configuration, no flags to learn.

---

## Published research

This project is referenced as a scientific contribution in a peer-reviewed publication:

> **Solodova A. S., Petrakov D. A., Puganov K. A.** (2024).
> *Numerical simulation of debris flow caused by Bashkara Glacier lake outburst flood in 2017.*
> **Ice and Snow (Лёд и Снег)**, 64(4), 527–542. Lomonosov Moscow State University.
> DOI: [10.31857/S2076673424040043](https://doi.org/10.31857/S2076673424040043) ·
> [Journal page](https://ice-snow.igras.ru/jour/article/view/1453) ·
> EDN: [HTRDDK](https://elibrary.ru/htrddk)

The authors of the paper are also the co-authors of this web-app. The study simulates the 2017 Bashkara Lake outburst in the Adyl-Su valley (Central Caucasus) and, for the first time in the region, calculates flow pressure, kinetic energy, erosion and accumulation along the channel.

The paper explicitly names two usability limitations of the stock `r.avaflow` that motivated this project:

> *"…labor-intensive input preparation, **no graphical user interface**, **single CPU core utilization**, and high memory demand. The computations in this work used 16 GB of RAM and lasted more than 40 hours."*
>
> — Solodova, Petrakov, Puganov (2024), p. 529

Both limitations are addressed here:
- **No GUI** → the 7-step wizard replaces the terminal and shell-scripting workflow.
- **Single-core engine** → OpenMP parallelization now scales across all available cores (see the speed-up table above).

---

## Quick start

### Run the pre-built image (easiest)

```bash
docker run -d -p 3001:3000 \
  -v avaflow-data:/data/projects \
  --name avaflow \
  ghcr.io/kostyanp95/r-avaflow:webapp-latest
```

Open <http://localhost:3001>. Done.

### Develop locally

```bash
cd web-app
npm install
npm run start:dev   # NestJS on :3000, Angular on :4200 with hot-reload
```

Full developer notes — [`web-app/README.md`](./web-app/README.md).

---

## Tech stack

<table>
<tr>
<td valign="top">

**Computational core**
- C — `r.avaflow.main/main.c`
- OpenMP (CPU parallelization)
- OpenACC (upstream, GPU)
- GRASS GIS 8.4 bindings

</td>
<td valign="top">

**Web application**
- NestJS 9 (backend)
- Angular 15.2 + ng-zorro-antd
- Socket.IO (live streaming)
- @ngx-translate (EN / RU)

</td>
<td valign="top">

**Infrastructure**
- Docker multi-stage builds
- GitHub Container Registry
- GitHub Actions CI
- K3s deployment manifests
- Playwright E2E + Karma units

</td>
</tr>
</table>

---

## Documentation

- [`web-app/README.md`](./web-app/README.md) — developer guide (stack, install, build, API, WebSocket events)
- [`web-app/PARAMETER_REFERENCE.md`](./web-app/PARAMETER_REFERENCE.md) — every parameter, every tooltip, every validation rule
- [`web-app/FORM_COMPARISON_REPORT.md`](./web-app/FORM_COMPARISON_REPORT.md) — how the wizard maps onto the original `r.avaflow` form
- [`web-app/KOLKA_CALIBRATION_REPORT.md`](./web-app/KOLKA_CALIBRATION_REPORT.md) — calibration recipe for the 2002 Kolka Glacier case

---

## Engine version and migration plan

The web-app currently drives **`r.avaflow` version 3 (3G)** — released **2023-01-27** and referred to throughout the scientific literature (including [our published paper](#published-research)) as the canonical reference implementation. This is the version we parallelized with OpenMP and validated on the 2017 Bashkara and 2002 Kolka events.

Upstream has since released **r.avaflow version 4 (40G)** — a major rewrite published **2025-09-02** and documented in Mergili et al. (2025), *Geoscientific Model Development* 18, 9879–9896. The new version introduces:

- **Controlled deformation (CDEFORM)** — replaces the legacy dynamic-friction and yield-stress scheme with a physically grounded deformation parameter.
- **Fragmentation** — energy loss and momentum decay models for rock avalanches.
- **Per-phase cohesion** and **layered phase model** (phases stack vertically instead of mixing).
- **Slow-flow regime** for velocities below ~5 m/s (earthflows, rock glaciers).
- **Temperature & ice-melting coupling** — 10th state equation with latent heat exchange.
- **Mandatory topography-following heights** (`h → h·cos β`) throughout.

**3G → 40G is a breaking change** — results are not directly comparable, calibrated parameter sets must be re-calibrated, and the GRASS module interface is different. For this reason the web-app is currently pinned to 3G; migration is on the roadmap below.

---

## Roadmap

- [ ] **Migrate computational backend to `r.avaflow` 4.0G** — extended physics (CDEFORM, fragmentation, cohesion, layered model, slow-flow, ice melting)
- [ ] Presets for common scenarios ("Glacial collapse", "Debris-flow with GLOF", "Snow avalanche")
- [ ] GPU (OpenACC) engine exposed through the web-app
- [ ] Simulation diff viewer (compare two runs side by side)
- [ ] Built-in calibration tool (ROC-guided parameter sweep)
- [ ] Cloud deploy templates (AWS / DigitalOcean / self-hosted K3s)

---

## Credits

**Web application**
Konstantin Puganov · Anna Solodova · Dmitry Petrakov

**Physics model — r.avaflow core**
Martin Mergili · Shiva P. Pudasaini (2014–2025) · <https://avaflow.org>

**Key references**
- Mergili M., Pfeffer H., Kellerer-Pirklbauer A., Zangerl C., Pudasaini S.P. (2025). *r.avaflow v4, a multi-purpose landslide simulation framework.* Geoscientific Model Development 18, 9879–9896. <https://doi.org/10.5194/gmd-18-9879-2025>
- Pudasaini S.P., Mergili M. (2019). *A multi-phase mass flow model.* JGR: Earth Surface 124(12), 2920–2942.

---

## Contributing

Bug reports, feature requests and pull requests are very welcome. If you are a domain scientist who calibrated a case study against observational data, consider opening an issue — successful validations like the Kolka case help shape the default-preset roadmap.

## License

Distributed under **GNU General Public License v2.0 or later**, inherited from the `r.avaflow` core. See the upstream [r.avaflow repository](https://www.landslidemodels.org/r.avaflow/) for the full license text.
