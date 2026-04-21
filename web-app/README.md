<div align="center">

# r.avaflow · web-app

**Angular 15 + NestJS 9 full-stack application that drives the `r.avaflow` simulation engine.**

Frontend (`src/`) and backend (`server/`) ship together as a single Docker image exposing a browser UI on port `3000`.

[![Angular](https://img.shields.io/badge/Angular-15.2-DD0031?logo=angular&logoColor=white)](https://angular.io)
[![NestJS](https://img.shields.io/badge/NestJS-9-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Ant Design](https://img.shields.io/badge/ng--zorro--antd-15-0170FE)](https://ng.ant.design)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.6-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![Node](https://img.shields.io/badge/Node-%E2%89%A518.10-339933?logo=node.js&logoColor=white)](https://nodejs.org)

[🇷🇺 Русская версия](./README_ru.md) · [⬅ Back to top-level README](../README.md)

</div>

---

## Table of contents

- [At a glance](#at-a-glance)
- [Directory layout](#directory-layout)
- [Quick start](#quick-start)
- [Build & deploy](#build--deploy)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [HTTP API](#http-api)
- [WebSocket events](#websocket-events)
- [How it works end-to-end](#how-it-works-end-to-end)
- [Reports & references](#reports--references)
- [License](#license)

---

## At a glance

| Layer | Technology |
|---|---|
| **Frontend** | Angular 15.2 · ng-zorro-antd 15 (Ant Design) · TypeScript 4.8 · SCSS |
| **Backend** | NestJS 9 · Express · Socket.IO 4.6 · Multer · Archiver |
| **Real-time** | WebSocket (Socket.IO) — simulation logs, status, events |
| **Testing** | Playwright (E2E) · Karma + Jasmine (Angular unit) · Jest (NestJS) |
| **i18n** | `@ngx-translate/core` — English, Russian |
| **Runtime** | Node ≥ 18.10 · Docker (to actually run simulations) |

The NestJS backend serves the compiled Angular bundle via `@nestjs/serve-static`, so in production **everything lives behind a single port** (`:3000`). No reverse proxy, no separate frontend host.

---

## Directory layout

```
web-app/
├── src/                              # Angular SPA
│   ├── app/
│   │   ├── home/                     # Main feature module
│   │   │   ├── simulation-wizard/    # 7-step parameter form
│   │   │   ├── simulation-status/    # Live log panel, CPU/RAM gauges
│   │   │   ├── simulation-results/   # Image grid, file browser, ZIP export
│   │   │   └── project-form/         # Project CRUD sidebar
│   │   ├── core/services/            # ThemeService, WebSocketService
│   │   └── shared/                   # Shared components
│   ├── assets/i18n/                  # en.json, ru.json translations
│   └── environments/                 # environment.ts / .prod.ts / .web.ts
│
├── server/                           # NestJS backend
│   └── src/
│       ├── app.controller.ts         # REST: /projects, /run, /upload, /health
│       ├── app.gateway.ts            # WebSocket: simulationLog, simulationDone, ...
│       ├── app.service.ts            # Business logic: script gen, engine spawn
│       └── storage-options.ts        # Multer disk-storage config
│
├── e2e/                              # Playwright specs
│   ├── simulation-wizard.spec.ts
│   ├── simulation-status.spec.ts
│   ├── project-management.spec.ts
│   └── playwright.config.ts
│
├── Dockerfile                        # Local build image
├── PARAMETER_REFERENCE.md            # Every parameter · tooltip · validation rule
├── FORM_COMPARISON_REPORT.md         # Coverage vs. original r.avaflow form
├── KOLKA_CALIBRATION_REPORT.md       # Ice-rock avalanche calibration recipe
└── QA_REPORT.md                      # Bug-fix history
```

---

## Quick start

### Prerequisites

- **Node.js** ≥ 18.10 (tested against 18 / 20)
- **npm** (bundled with Node)
- **Docker** — required to actually run simulations (the backend spawns a GRASS-GIS container)

### Install

```bash
cd web-app
npm install
npm install --prefix server
```

### Develop (hot-reload, both processes)

```bash
npm run start:dev
```

Two processes start concurrently:

| Process | URL | Purpose |
|---|---|---|
| NestJS backend | <http://localhost:3000> | `/api` REST + WebSocket |
| Angular dev server | <http://localhost:4200> | SPA with hot-reload, proxies to `:3000` |

Open <http://localhost:4200> in your browser.

### Run backend or frontend alone

```bash
npm --prefix server run start:dev    # backend only
npm run ng:serve                     # frontend only (-c web profile)
```

---

## Build & deploy

### Production build

```bash
npm run web:build                    # Angular → dist/
npm --prefix server run build        # NestJS → server/dist/
```

In production, NestJS serves `dist/` statically — a single container on port `3000` is enough.

### Docker (from repository root)

```bash
docker build -f Dockerfile.prod -t r-avaflow:webapp .
docker run -p 3000:3000 \
  -e OMP_NUM_THREADS=8 \
  -v avaflow-data:/data/projects \
  r-avaflow:webapp
```

Pre-built image: `ghcr.io/kostyanp95/r-avaflow:webapp-latest`.

---

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP + WebSocket port |
| `NODE_ENV` | — | `production` enables optimizations |
| `AVAFLOW_PROJECTS_PATH` | `projects/` | Where per-project data is stored (mount this as a volume) |
| `OMP_NUM_THREADS` | _(auto)_ | CPU thread count for the OpenMP-parallelized core |

---

## Testing

### Angular unit tests — Karma + Jasmine

```bash
npm test               # headless, single run
npm run test:watch     # watch mode
```

### NestJS unit + e2e — Jest

```bash
npm --prefix server test
npm --prefix server run test:e2e
```

### Full end-to-end — Playwright

```bash
npm run e2e            # builds prod bundle, then runs e2e/*.spec.ts
npm run e2e:show-trace # inspect the latest trace
```

E2E specs boot a real NestJS + Angular instance and walk through the 7-step wizard, file uploads, live simulation status and project CRUD.

### Lint

```bash
npm run lint
```

---

## HTTP API

All REST endpoints are mounted under `/api`, except the `/health` liveness probe.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness probe (no `/api` prefix) |
| `GET` | `/api/projects` | List projects |
| `GET` | `/api/project?projectName=…` | Project config + file tree |
| `POST` | `/api/project` | Create project |
| `DELETE` | `/api/project/:name` | Delete project |
| `POST` | `/api/upload` | Raster upload (Multer: field `files`, body `projectName`) |
| `POST` | `/api/run` | Start simulation (spawns engine process) |
| `POST` | `/api/run/stop` | Kill running simulation |
| `GET` | `/api/project/:name/download` | Stream project ZIP (via `archiver`) |

---

## WebSocket events

Socket.IO connects to the same origin (no separate port). Server-emitted events:

| Event | Payload | Fired when |
|---|---|---|
| `simulationLog` | `{ projectName, line }` | Every stdout / stderr line from the engine |
| `simulationDone` | `{ projectName, exitStatus }` | Engine process exits |
| `filesUploaded` | `{ projectName, files }` | Upload completes |
| `projectData` | `{ projectName, config, files }` | Project state refresh |

---

## How it works end-to-end

```
Browser (Angular SPA)
   │   HTTP /api/upload, /api/run, /api/projects, …
   │   WebSocket: simulationLog / simulationDone
   ▼
NestJS (port 3000)
   │   - Serves Angular bundle (@nestjs/serve-static)
   │   - REST controllers, WebSocket gateway
   │   - Generates r.avaflow shell script from wizard parameters
   │   - Spawns `docker run` with mounted project volume
   ▼
r.avaflow engine (GRASS GIS + C core)
   │   - Reads rasters + param.txt
   │   - OpenMP-parallelized NOC-TVD time loop
   │   - Writes outputs (ASCII rasters, PNG, GIF, CSV)
   ▼
Results viewer (back in the browser)
```

The wizard collects parameters, the backend **diffs them against defaults and emits only what changed** into the generated script (see `PARAMETER_REFERENCE.md`). Live logs stream over WebSocket while the simulation runs; on exit, the results viewer picks up generated PNGs/GIFs from the project volume.

---

## Reports & references

- [`PARAMETER_REFERENCE.md`](./PARAMETER_REFERENCE.md) — every parameter with tooltip text (EN + RU), type, default, validation rule
- [`FORM_COMPARISON_REPORT.md`](./FORM_COMPARISON_REPORT.md) — how much of the original `r.avaflow` form this wizard covers
- [`KOLKA_CALIBRATION_REPORT.md`](./KOLKA_CALIBRATION_REPORT.md) — calibration recipe that reproduced the 2002 Kolka Glacier collapse (first external academic validation of the web-app)
- [`QA_REPORT.md`](./QA_REPORT.md) — historical bug-fix log

---

## License

Inherits **GNU GPLv2+** from the `r.avaflow` core — see the [top-level README](../README.md).
