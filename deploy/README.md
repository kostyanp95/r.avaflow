# Эксплуатация r.avaflow: боевой деплой на RGT-PC (Docker Desktop)

Как r.avaflow реально развёрнут и обслуживается на self-hosted хосте. Публичный «Quick start» из [README](../README.md) — для запуска в один контейнер у себя; здесь — боевая инсталляция из двух контейнеров (classic 3G + 40G) на Windows-хосте домашнего кластера.

_Обновлено: 2026-09-21 · Основной источник синхронизации — `APPLICATIONS.md` в репо [Kostyanp95-cluster](D:\Kostyanp95-cluster) (секция r.avaflow)_

---

## Где крутится

- **Хост:** RGT-PC — Windows 11 Pro, LAN `192.168.0.76`, wg0 `10.1.0.23`, wg1 `10.3.0.23`.
- **Платформа:** Docker Desktop 4.90 (engine 29.7.2), WSL2 backend (дистрибутивы `docker-desktop`, `Ubuntu-22.04`). На этом же движке живут чужие контейнеры (bms-coop и др.) — см. [изоляция проектов](#изоляция-compose-проектов).
- **Compose-проект:** `ravaflow40g`, compose-файл — [`docker-compose.yml`](../docker-compose.yml) в корне репо.
- **Образы:** `ghcr.io/kostyanp95/r-avaflow` — собирает GitHub Actions ([build-and-push.yml](../.github/workflows/build-and-push.yml)) при push в `main`/`master`:
  - `Dockerfile.prod` → `webapp-latest` (classic, r.avaflow 3G);
  - `Dockerfile.prod-40g` → `webapp-40g-latest` (r.avaflow 40G, OpenMP).

| Контейнер | Образ | Порт (host→container) | Named volume → mount | Размер тома |
|---|---|---|---|---|
| `avaflow-classic` | `webapp-latest` | `0.0.0.0:3001→3000` | `ravaflow40g_avaflow-classic-data` → `/data/projects` | 13 GB |
| `avaflow-40g` | `webapp-40g-latest` | `0.0.0.0:3002→3000` | `ravaflow40g_avaflow-40g-data` → `/data/projects` | 5.2 GB |

Restart-политика `unless-stopped`; healthcheck — `curl -f localhost:3000/api/health` внутри контейнера.

**Автостарт:** Docker Desktop стартует при **логине** kosty (`AutoStart: true` в `%APPDATA%\Docker\settings-store.json`). Автологина при загрузке хоста нет → после ребута контейнеры поднимаются только после входа в сессию.

---

## Движок и параллелизм (проверено 2026-09-21)

- **Classic = r.avaflow 3G с собственным OpenMP-патчем** (12 регионов `#pragma omp` в `avaflow/r.avaflow.main/main.c`; сборка: `avaflow/r.avaflow.main/Makefile` → `EXTRA_CFLAGS = -fopenmp -O3`, `-lgomp`). В развёрнутом контейнере бинарник `/root/.grass8/addons/bin/r.avaflow.main` слинкован с `libgomp.so.1` — проверено. Прод-компос даёт classic `OMP_NUM_THREADS=20`.
- **40G = upstream OpenMP**, прод `OMP_NUM_THREADS=8`. Параметр `cores` в форме 40G — параллельные Монте-Карло мульти-прогоны (`flag_m=1`), а не потоки внутри прогона.
- Слайдер CPU в web-app инициализируется из env `OMP_NUM_THREADS` (`web-app/server/src/app.controller.ts:92`).
- **Колка-2002 (курсовая) и все августовские колка-эксперименты считались на classic 3G** (скрипты зовут `r.avaflow`, `phases=s,fs,f`, cellsize 30). В 40G-томе колки нет.
- ⚠️ `g.extension` ставит аддон в `$HOME/.grass8/addons/bin`, а не в `/usr/lib/grass84/bin` — не искать модуль не там.

---

## Доступ и сеть

- **wg1:** `http://10.3.0.23:3001` (classic), `http://10.3.0.23:3002` (40g). Так же ходит K3s-кластер через ExternalService — [`deploy/k3s-external-service.yaml`](k3s-external-service.yaml) (endpoint `10.3.0.23`).
- **Публично (с 2026-09-21):** `https://r-avaflow.kostyanp95.crazedns.ru` → KeenDNS (Keenetic «Гжель», запись web-app **Unrestricted**) → форвард на **`10.1.0.23:3001`** (wg0-адрес RGT-PC) → контейнер `avaflow-classic`. Это третий, отдельный маршрут доменной схемы кластера: остальные `*.kostyanp95.crazedns.ru` идут через raspberrypi→NodePort, `rgt-gpt.*` — через nginx RGT-PC `:3000` (тоже на 10.1.0.23), а этот — прямо на публикацию Docker Desktop. Проверка маршрута — по `/api/projects` (список проектов различает classic и 40G; ETag/index.html у обоих контейнеров идентичны и различить не могут). Для 40G (`:3002`) публичного имени нет — при необходимости добавить в KeenDNS по тому же образцу.
- **Проверка живости:** `GET /health` → `{"status":"ok","timestamp":…}` (работает и локально, и через публичный URL). 🔴 **Эндпоинт — `/health`, без префикса `/api`** (`server/src/main.ts`: `setGlobalPrefix('api', { exclude: ['health'] })`; по `/api/health` отвечает SPA-fallback с index.html и 200). Healthcheck в репо-композе исправлен на `/health` (2026-09-21); на развёрнутых контейнерах старый healthcheck живёт до пересоздания (`docker compose -p ravaflow40g up -d` подхватит новый конфиг).
- **Firewall RGT-PC:** правила «r.avaflow 3001/3002 (deploy)» — Allow, профиль Any.
- ⚠️ **Правила — не фактический контроль доступа.** Установщик Docker Desktop ставит blanket-правила «Docker Desktop Backend» (Allow, any port / any source) для `com.docker.backend.exe` — они **перекрывают** скоупед-правила по портам. Фактическая экспозиция = IP-биндинг контейнера + маршрутизируемость. Здесь биндинг `0.0.0.0` → порты доступны из всей LAN `192.168.0.0/24` и wg-сетей, а с появлением публичного URL — и из интернета. С 2026-09-21 у webapp есть **авторизация через Telegram-бота** (см. след. секцию) — включается env-переменными, при её отсутствии приложение работает в прежнем открытом режиме; скоупед Windows-firewall из-за blanket-правил по-прежнему не сработает.

---

## Авторизация через Telegram-бота (2026-09-21)

Персональный доступ: каждый пользователь видит **только свои проекты**; администраторы — проекты всех, сгруппированные по юзеру (сворачиваемые секции в сайдбаре). Вход: кнопка «Открыть Telegram-бота» на странице логина → Start в Telegram → кнопка «Войти»/код из бота → 30-дневная сессия в httpOnly-cookie.

**Архитектура (важно для двух контейнеров):** Telegram разрешает ровно **один** `getUpdates`-поллер на токен бота. Поэтому токен бота фактически работает на `avaflow-classic` (`TG_BOT_POLLING` не отключён), а `avaflow-40g` только **проверяет** одноразовые логин-токены общим секретом `TG_AUTH_SECRET` (stateless: юзер может начать вход на :3002 — бот на classic отдаст ссылку обратно на origin :3002, 40G проверит токен сам). Владение/пользователи хранятся в `/data/projects/.ravaflow-auth.json` **в каждом томе отдельно** (у classic и 40G пользователи/владельцы независимы — это разные инсталляции данных).

### Env-переменные (в проде добавить в `C:\Docker\docker-compose.yml`, значения — из репо-`.env`)

```yaml
# avaflow-classic:
  TG_AUTH_SECRET: <openssl rand -hex 32, ОДИНАКОВО для classic и 40g>
  TG_ADMIN_IDS: "1049276038,262857249"
  TG_BOT_USERNAME: web_r_avaflow_bot
  TG_BOT_TOKEN: 8856171498:AAH...   # токен @web_r_avaflow_bot; поллит только classic
  TG_BOT_POLLING: "true"            # ровно на одном сервисе!
# avaflow-40g — то же, но TG_BOT_POLLING: "false"
```

Порядок rollout: пересобрать/запулить новые образы → добавить env в оба сервиса → `docker compose -p ravaflow40g up -d` (пересоздаёт контейнеры, ~10–20 с даунтайма) → проверить `curl http://localhost:3001/api/auth/config` → `{"enabled":true,"botUsername":"web_r_avaflow_bot"}` → в логах classic: `[auth] Telegram bot @web_r_avaflow_bot connected` → зайти по публичному URL и войти через бота.

### Эксплуатация

- **Админы** — `TG_ADMIN_IDS` (сейчас 1049276038, 262857249). Смена = правка env + `up -d`; роль читается на каждый запрос, существующие сессии подхватывают сразу.
- **Регистрация открыта** любому, кто найдёт бота; ограничить — `TG_ALLOWED_IDS` (список Telegram-ID через запятую; админы проходят всегда).
- **Легаси-проекты** (kolka_*, bashkara_* — созданы до авторизации, владельца не имеют) видны **только админам** в секции «Без владельца (устаревшие)». Новые проекты привязываются к создателю автоматически.
- **Ротация секрета** `TG_AUTH_SECRET` = мгновенный logout всех (все сессии подписаны старым ключом). Токен бота ротируется в @BotFather + env.
- **Контейнеры**: `PUT /api/run/cpus` (слайдер CPU) теперь admin-only; остановить чужую симуляцию может только её владелец или админ; логи симуляции через socket.io уходят только в комнату владельца.
- **Smoke-тест** после изменений: `cd web-app/server && npm run build && node scripts/auth-smoke-test.cjs` (26 проверок: обмен токена, изоляция, права, бот-хендлер).

### Безопасность (принятые компромиссы)

- Одноразовый код живёт 10 минут, проверяется HMAC-SHA256; без state нельзя отозвать «использованным» — окно повтора укладывается в TTL (угроза требует доступа к чату юзера).
- Сессия — HS256-JWT в httpOnly SameSite=Lax cookie, 30 дней; XSS-безопасное хранение, CSRF прикрыт Lax.
- Официальный **Login Widget** (требует `/setdomain` в BotFather) поддержан эндпоинтом `POST /api/auth/tg/widget` как запасной путь — но bot-флоу выбран основным, т.к. работает на wg-IP и без настройки домена.
- Бот отправляет ссылку входа на origin из deep-link payload — в сообщении виден полный адрес; фишинговый риск аналогичен поддельным ботам (лучший ответ — проверить юзернейм @web_r_avaflow_bot).

---

## Обновление

CI пушит новые образы в ghcr.io; на RGT-PC забрать и перезапустить (команды — в каталоге с compose-файлом):

```powershell
# ВНИМАНИЕ: из SSH-сессии pull НЕ работает (см. грабли №2) — только интерактивная сессия RGT-PC
docker compose -p ravaflow40g pull
docker compose -p ravaflow40g up -d
```

[`deploy/avaflow-deploy.sh`](avaflow-deploy.sh) — pull-based деплой под crontab (`*/5 * * * *`, сравнивает digest'ы, при обновлении делает `pull` + `up -d`).

**Бэкапы:** последний снапшот томов — `D:\Docker-Backup-2026-04-22\` на RGT-PC (инвентарь — `configs/open-webui/DOCKER-BACKUP-2026-04-22.md` в репо Kostyanp95-cluster). Данные пользователей (проекты симуляций) живут только в named volumes — перед `docker compose down -v` или пересозданием тома делать бэкап.

---

## Ops-команды

```powershell
docker compose -p ravaflow40g ps                          # статус (ожидается healthy)
docker logs --tail 50 avaflow-classic                     # логи classic
docker logs --tail 50 avaflow-40g                         # логи 40g
docker compose -p ravaflow40g restart                     # рестарт обоих
docker volume ls | findstr ravaflow40g                    # тома с данными
curl.exe -s http://localhost:3001/health                  # {"status":"ok",...} = API жив (путь /health, НЕ /api/health)
curl.exe -s https://r-avaflow.kostyanp95.crazedns.ru/health   # то же через публичный URL
curl.exe -s http://localhost:3001/api/auth/config        # {"enabled":true,"botUsername":"web_r_avaflow_bot"} = авторизация включена
docker logs --tail 20 avaflow-classic | findstr auth     # "[auth] Telegram bot ... connected" / 409-предупреждения
```

---

## 🔴 Грабли

### 1. netsh portproxy поверх Docker-публикации = тихая поломка извне (инцидент 2026-09-21)

**Симптом:** `http://10.3.0.23:3001/3002` снаружи — connection reset, при этом `localhost:3001` на самом RGT-PC работает и выглядит «всё ок».

**Причина:** на те же порты висел старый `netsh interface portproxy` (наследие WSL-деплоя `172.26.95.155:4001/4002` — порт в WSL закрыт). Получается два листенера на `0.0.0.0:3001` — svchost (portproxy) и `com.docker.backend.exe`; **внешний** (не loopback) трафик перехватывает portproxy и форвардит на мёртвую цель.

**Диагностика:**
```powershell
netstat -ano | findstr :3001            # ДВА PID = конфликт
netsh interface portproxy show all      # кто и куда форвардит
Test-NetConnection <wsl-ip> -Port 4001  # жива ли цель portproxy
```

**Лечение:**
```powershell
netsh interface portproxy delete v4tov4 listenport=3001 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=3002 listenaddress=0.0.0.0
```

**Правило:** не вешать portproxy на порты, опубликованные Docker-контейнерами. Docker Desktop может менять WSL-IP при перезагрузке — portproxy на WSL-IP в принципе хрупок.

### 2. Registry-операции (pull/push) из SSH-сессии не работают

`docker pull` из SSH падает: `error getting credentials ... A specified logon session does not exist` — credential helper (`credsStore: desktop`) требует интерактивный логон-сеанс. Чистка `credsStore` в `~\.docker\config.json` не помогает (хелпер зовётся всё равно). Локальные операции из SSH работают (`ps/logs/exec`, `compose up` при уже скачанном образе).

**Обходы:**
- есть интерактивная сессия (проверка: `quser`) → одноразовая Scheduled Task `LogonType=Interactive` (Register → `Start-ScheduledTask` → Unregister) выполняет pull/сборку от имени юзера;
- либо `docker save` на хосте с образом → `scp` → `docker load` на целевом.

### 3. Долгие команды из SSH — только через scheduled tasks

`Start-Process` запущенного из SSH-сессии `.bat` **умирает вместе с сессией**. Долгие операции (билд, pull большого образа) выносить в scheduled tasks. Для headless-хостов (без интерактивной сессии) — S4U-задачи: `New-ScheduledTaskPrincipal -LogonType S4U -RunLevel Highest` — elevation без пароля.

**Чистый рестарт Docker Desktop после падения движка:** `taskkill /f` на `Docker Desktop.exe`, `com.docker.backend.exe`, `com.docker.build.exe` + `wsl --shutdown` → повторный старт задачи → ждать 2–4 мин (первые минуты возможны разовые 500 на `_ping` — ретраить). Контейнеры с `restart: unless-stopped` поднимаются сами.

### 4. docker compose build буферизует вывод

Build-фронтенд Desktop копит весь вывод до конца — лог пустой часами. Для стриминга:

```powershell
docker buildx build --builder desktop-linux --progress plain --load -f Dockerfile.prod -t ghcr.io/kostyanp95/r-avaflow:webapp-latest . > build.log 2>&1
```

### 5. Изоляция compose-проектов

На движке RGT-PC живут и чужие compose-проекты (bms-coop и др.). Каждый изолировать `.env` с `COMPOSE_PROJECT_NAME=...` (здесь — `ravaflow40g`), иначе имена томов/сетей могут пересечься.

### 6. Docker Desktop сам себя обновляет посреди работы

Наблюдалось: CLI 29.3.1 → 29.7.2 с рестартом движка. Контейнеры с restart-политикой это переживают, но длинный прогон симуляции лучше не начинать во время окна обновления.

### 7. Порты 3001/3002 могут «перекреститься» после старта WSL-дистрибутива (2026-09-21)

Docker Desktop с WSL-integration публикует порты контейнеров и **внутри** Ubuntu-22.04 (`127.0.0.1:3001/3002` в WSL ведут в DD-контейнеры), а `wslrelay.exe` при этом держит на Windows `[::1]:3001/3002`. Если WSL-дистрибутив стартует одновременно/рядом с DD-движком, форвардинг `com.docker.backend` программируется **перекрёстно**: `:3001` отдаёт 40G-данные, `:3002` — classic (netstat: `0.0.0.0:3001` = com.docker.backend + `[::1]:3001` = wslrelay). Симптомы как у portproxy-инцидента (№1), но таблица `netsh interface portproxy` чистая.

**Диагностика:** сравнить `GET /api/projects` на :3001 и :3002 — classic-набор должен быть на **3001**, `bashkara_cal2` — на **3002**; `netstat -ano | findstr ":3001 :3002"` (два владельца порта = конфликт с wslrelay).

**Лечение:** `docker restart avaflow-classic avaflow-40g` — backend перепрограммирует публикации корректно (проверено 2026-09-21, даунтейм ~10 с).

### 8. WSL-«теневой» деплой (Ubuntu-22.04) и перенос данных (2026-09-21)

В WSL Ubuntu-22.04 на RGT-PC живёт **второй, параллельный деплой**: свой docker-демон (29.4.0, systemd, data-root — отдельный vhdx `/dev/sdf` → `/var/lib/docker`), те же контейнеры `avaflow-classic`/`avaflow-40g` на портах **4001/4002**, тот же compose-проект `ravaflow40g`. Августовские эксперименты по Колке велись в нём. Кандидат на вывод из эксплуатации — до тех пор не трогать порты и не путать с продом.

**Перенос данных WSL → Docker Desktop (2026-09-21):**
- `bashkara_final`, `bashkara_orig`, `kolka_e2e_test` (classic) и `bashkara_cal2` (40g) — **байт-в-байт идентичны** в обоих деплоях, не переносились;
- `kolka_1` (479 791 463 Б, 424 файла) и `kolka_test` (598 011 827 Б, 420 файлов) — WSL-версии полнее; перенесены под каноническими именами, прежние DD-копии сохранены рядом как `kolka_1.dd-2026-09-21` и `kolka_test.dd-2026-09-21`;
- `kolka_calibrated`: наборы разные — в DD богатая версия с результатами (257 МБ), в WSL маленькая свежая конфигурация (3 МБ); WSL-версия перенесена как `kolka_calibrated_wsl` (внутренние json/sh переименованы под имя каталога, иначе web-app показывает hasJson=false);
- `kolka_2` — существует только в DD, не тронут.

Метод: `docker exec … tar -cf - <проект>` в WSL-контейнере → pipe через `cmd /c` (бинарно безопасен) → `docker exec -i … tar -xf -` в DD-контейнер. ⚠️ Не читать данные по хост-путям WSL (`/var/lib/docker/volumes/...`): монтирование `/dev/sdf` появляется с задержкой после старта дистрибутива, и путь может молча не резолвиться — работать через `docker exec` в контейнер, там всегда консистентный вид.

### 9. Два getUpdates-поллера на один токен бота = 409 (2026-09-21)

Если `TG_BOT_TOKEN` задан обоим контейнерам **с включённым polling**, Telegram отвечает `409 Conflict: terminated by other getUpdates request` — апдейты будут доставляться вперемешку (вход через бота станет флапающим). **Правило:** `TG_BOT_POLLING: "true"` ровно на одном сервисе (classic); 40G всегда `"false"` — он проверяет логин-токены секретом `TG_AUTH_SECRET`, бот ему не нужен. Сервер переживает 409 корректно (backoff + предупреждение в лог раз в 5 мин), но это сигнал, что конфиг неверен.

Смежное: после включения авторизации легаси-проекты без владельца исчезают у обычных юзеров (это фича, не баг) — админы видят их в секции «Без владельца».

---

## См. также

- `APPLICATIONS.md` (репо Kostyanp95-cluster, `D:\Kostyanp95-cluster`) — каталог всех сервисов кластера, секция **r.avaflow (web UI)** и секция **Docker Desktop (RGT-PC)** с общими граблями;
- память кластерного проекта `rgt-pc-docker-desktop-quirks` — тот же список граблей Docker Desktop в сокращённом виде;
- [`README.md`](../README.md) / [`README_ru.md`](../README_ru.md) — продукт, быстрый старт;
- [`web-app/README.md`](../web-app/README.md) — разработка и сборка.
