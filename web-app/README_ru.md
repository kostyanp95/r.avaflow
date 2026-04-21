<div align="center">

# r.avaflow · web-app

**Full-stack приложение на Angular 15 + NestJS 9, управляющее симуляционным движком `r.avaflow`.**

Фронтенд (`src/`) и бэкенд (`server/`) собираются в один Docker-образ с веб-интерфейсом на порту `3000`.

[![Angular](https://img.shields.io/badge/Angular-15.2-DD0031?logo=angular&logoColor=white)](https://angular.io)
[![NestJS](https://img.shields.io/badge/NestJS-9-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Ant Design](https://img.shields.io/badge/ng--zorro--antd-15-0170FE)](https://ng.ant.design)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.6-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![Node](https://img.shields.io/badge/Node-%E2%89%A518.10-339933?logo=node.js&logoColor=white)](https://nodejs.org)

[🇬🇧 English version](./README.md) · [⬅ Назад к основному README](../README_ru.md)

</div>

---

## Содержание

- [Обзор](#обзор)
- [Структура каталога](#структура-каталога)
- [Быстрый старт](#быстрый-старт)
- [Production-сборка и деплой](#production-сборка-и-деплой)
- [Переменные окружения](#переменные-окружения)
- [Тестирование](#тестирование)
- [HTTP API](#http-api)
- [WebSocket-события](#websocket-события)
- [Как это работает end-to-end](#как-это-работает-end-to-end)
- [Отчёты и справочники](#отчёты-и-справочники)
- [Лицензия](#лицензия)

---

## Обзор

| Слой | Технология |
|---|---|
| **Фронтенд** | Angular 15.2 · ng-zorro-antd 15 (Ant Design) · TypeScript 4.8 · SCSS |
| **Бэкенд** | NestJS 9 · Express · Socket.IO 4.6 · Multer · Archiver |
| **Real-time** | WebSocket (Socket.IO) — логи симуляции, статус, события |
| **Тестирование** | Playwright (E2E) · Karma + Jasmine (Angular unit) · Jest (NestJS) |
| **i18n** | `@ngx-translate/core` — English, Russian |
| **Runtime** | Node ≥ 18.10 · Docker (для запуска симуляций) |

NestJS-бэкенд сам отдаёт собранный Angular-бандл через `@nestjs/serve-static` — в production **всё живёт за одним портом** (`:3000`). Никаких reverse-proxy, никакого отдельного хоста для фронтенда.

---

## Структура каталога

```
web-app/
├── src/                              # Angular SPA
│   ├── app/
│   │   ├── home/                     # Основной feature-модуль
│   │   │   ├── simulation-wizard/    # Форма параметров из 7 шагов
│   │   │   ├── simulation-status/    # Live-панель логов, датчики CPU/RAM
│   │   │   ├── simulation-results/   # Сетка изображений, файл-браузер, ZIP
│   │   │   └── project-form/         # Сайдбар CRUD проектов
│   │   ├── core/services/            # ThemeService, WebSocketService
│   │   └── shared/                   # Общие компоненты
│   ├── assets/i18n/                  # en.json, ru.json — переводы
│   └── environments/                 # environment.ts / .prod.ts / .web.ts
│
├── server/                           # NestJS backend
│   └── src/
│       ├── app.controller.ts         # REST: /projects, /run, /upload, /health
│       ├── app.gateway.ts            # WebSocket: simulationLog, simulationDone, ...
│       ├── app.service.ts            # Бизнес-логика: генерация скрипта, spawn движка
│       └── storage-options.ts        # Multer disk-storage
│
├── e2e/                              # Playwright-спеки
│   ├── simulation-wizard.spec.ts
│   ├── simulation-status.spec.ts
│   ├── project-management.spec.ts
│   └── playwright.config.ts
│
├── Dockerfile                        # Локальный build-образ
├── PARAMETER_REFERENCE.md            # Все параметры · подсказки · правила валидации
├── FORM_COMPARISON_REPORT.md         # Покрытие оригинальной формы r.avaflow
├── KOLKA_CALIBRATION_REPORT.md       # Калибровка ледово-каменной лавины
└── QA_REPORT.md                      # История багфиксов
```

---

## Быстрый старт

### Требования

- **Node.js** ≥ 18.10 (проверено на 18 / 20)
- **npm** (идёт в комплекте с Node)
- **Docker** — нужен для реального запуска симуляций (бэкенд спавнит GRASS-GIS-контейнер)

### Установка

```bash
cd web-app
npm install
npm install --prefix server
```

### Dev-режим (hot-reload, оба процесса)

```bash
npm run start:dev
```

Запускаются параллельно два процесса:

| Процесс | URL | Назначение |
|---|---|---|
| NestJS-бэкенд | <http://localhost:3000> | `/api` REST + WebSocket |
| Angular dev-сервер | <http://localhost:4200> | SPA с hot-reload, проксирует на `:3000` |

Открой в браузере <http://localhost:4200>.

### Запуск только бэкенда или только фронтенда

```bash
npm --prefix server run start:dev    # только бэкенд
npm run ng:serve                     # только фронтенд (-c web profile)
```

---

## Production-сборка и деплой

### Сборка

```bash
npm run web:build                    # Angular → dist/
npm --prefix server run build        # NestJS → server/dist/
```

В production NestJS отдаёт `dist/` статически — достаточно одного контейнера на порту `3000`.

### Docker (из корня репозитория)

```bash
docker build -f Dockerfile.prod -t r-avaflow:webapp .
docker run -p 3000:3000 \
  -e OMP_NUM_THREADS=8 \
  -v avaflow-data:/data/projects \
  r-avaflow:webapp
```

Готовый образ: `ghcr.io/kostyanp95/r-avaflow:webapp-latest`.

---

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `PORT` | `3000` | Порт HTTP + WebSocket |
| `NODE_ENV` | — | `production` включает оптимизации |
| `AVAFLOW_PROJECTS_PATH` | `projects/` | Куда сохраняются данные проектов (монтируй как том) |
| `OMP_NUM_THREADS` | _(auto)_ | Число CPU-потоков для OpenMP-распараллеленного ядра |

---

## Тестирование

### Angular unit-тесты — Karma + Jasmine

```bash
npm test               # headless, один прогон
npm run test:watch     # watch-режим
```

### NestJS unit + e2e — Jest

```bash
npm --prefix server test
npm --prefix server run test:e2e
```

### Полный end-to-end — Playwright

```bash
npm run e2e            # собирает prod-бандл, затем гоняет e2e/*.spec.ts
npm run e2e:show-trace # посмотреть последний trace
```

E2E-спеки поднимают реальный NestJS + Angular и проходят 7-шаговый wizard, загрузку файлов, live-статус симуляции и CRUD проектов.

### Линт

```bash
npm run lint
```

---

## HTTP API

Все REST-эндпоинты под префиксом `/api`, кроме liveness-пробы `/health`.

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/health` | Liveness-проба (без префикса `/api`) |
| `GET` | `/api/projects` | Список проектов |
| `GET` | `/api/project?projectName=…` | Конфигурация проекта + дерево файлов |
| `POST` | `/api/project` | Создать проект |
| `DELETE` | `/api/project/:name` | Удалить проект |
| `POST` | `/api/upload` | Загрузка растров (Multer: field `files`, body `projectName`) |
| `POST` | `/api/run` | Запуск симуляции (spawn движка) |
| `POST` | `/api/run/stop` | Убить запущенную симуляцию |
| `GET` | `/api/project/:name/download` | Стрим ZIP проекта (через `archiver`) |

---

## WebSocket-события

Socket.IO подключается на тот же origin (отдельный порт не нужен). Server-emitted events:

| Событие | Payload | Когда срабатывает |
|---|---|---|
| `simulationLog` | `{ projectName, line }` | Каждая строка stdout / stderr движка |
| `simulationDone` | `{ projectName, exitStatus }` | Процесс движка завершился |
| `filesUploaded` | `{ projectName, files }` | Загрузка файлов завершилась |
| `projectData` | `{ projectName, config, files }` | Обновление состояния проекта |

---

## Как это работает end-to-end

```
Браузер (Angular SPA)
   │   HTTP /api/upload, /api/run, /api/projects, …
   │   WebSocket: simulationLog / simulationDone
   ▼
NestJS (порт 3000)
   │   - Отдаёт Angular-бандл (@nestjs/serve-static)
   │   - REST-контроллеры, WebSocket-шлюз
   │   - Генерирует shell-скрипт r.avaflow из параметров wizard'а
   │   - Спавнит `docker run` с примонтированным томом проекта
   ▼
Движок r.avaflow (GRASS GIS + C-ядро)
   │   - Читает растры + param.txt
   │   - OpenMP-распараллеленный NOC-TVD time loop
   │   - Пишет результаты (ASCII-растры, PNG, GIF, CSV)
   ▼
Просмотрщик результатов (обратно в браузере)
```

Wizard собирает параметры, бэкенд **диффит их с дефолтами и выводит в скрипт только изменённое** (см. `PARAMETER_REFERENCE.md`). Во время работы симуляции логи стримятся по WebSocket; после завершения results-viewer подхватывает сгенерированные PNG/GIF из тома проекта.

---

## Отчёты и справочники

- [`PARAMETER_REFERENCE.md`](./PARAMETER_REFERENCE.md) — каждый параметр с подсказкой (EN + RU), типом, дефолтом, правилом валидации
- [`FORM_COMPARISON_REPORT.md`](./FORM_COMPARISON_REPORT.md) — насколько наш wizard покрывает оригинальную форму `r.avaflow`
- [`KOLKA_CALIBRATION_REPORT.md`](./KOLKA_CALIBRATION_REPORT.md) — рецепт калибровки, воспроизведший сход ледника Колка 2002 (первая внешняя академическая валидация web-app)
- [`QA_REPORT.md`](./QA_REPORT.md) — исторический лог багфиксов

---

## Лицензия

Наследует **GNU GPLv2+** от ядра `r.avaflow` — см. [основной README](../README_ru.md).
