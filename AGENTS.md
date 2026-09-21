# AGENTS.md — операционный контекст проекта r.avaflow

Краткая выжимка для агентов; полная операционная документация — [`deploy/README.md`](deploy/README.md).

## Operations & Deployment (verified 2026-09-21)

- **Прод:** RGT-PC (Docker Desktop), compose-проект `ravaflow40g`, развёрнутый compose — `C:\Docker\docker-compose.yml` (тома external, у classic дополнительно смонтирован docker.sock — этого нет в репо-версии). `avaflow-classic` (3G) = `:3001`, `avaflow-40g` = `:3002`; wg1-доступ `http://10.3.0.23:3001|3002`.
- **Публичный URL:** `https://r-avaflow.kostyanp95.crazedns.ru` → KeenDNS → `10.1.0.23:3001` (wg0) → classic. Бэкенд за портом различает **только `GET /api/projects`** (classic = список kolka_*/bashkara_*, 40G = один `bashkara_cal2`); ETag/index.html у контейнеров идентичны.
- **Health = `/health` без `/api`** (`server/src/main.ts`: exclude из префикса). `/api/health` отвечает SPA-fallback (index.html, 200) — healthcheck его не замечает как ошибку.
- **Грабль RGT-PC:** при одновременном старте WSL-дистрибутива и DD-движка порты 3001/3002 могут «перекреститься» (:3001 отдаёт 40G). Фикс: `docker restart avaflow-classic avaflow-40g`, проверка `/api/projects`. Не вешать netsh portproxy на порты Docker-публикаций. SSH до 10.3.0.23 флапает — ретраить.
- **WSL-теневой деплой** (Ubuntu-22.04, свой docker-демон, порты 4001/4002) — данные мигрированы в DD 2026-09-21 (колка-проекты; архивы `*.dd-2026-09-21`), кандидат на вывод из эксплуатации. Данные WSL читать только через `docker exec` (монтирование data-root появляется с задержкой).
- **Движки:** classic = r.avaflow 3G с нашим OpenMP-патчем (12 `#pragma omp` в `main.c`, сборка `-fopenmp`/`-lgomp`, в проде `OMP_NUM_THREADS=20`); 40G = upstream OpenMP (`=8`). Параметр `cores` в форме 40G — Монте-Карло мульти-прогоны, не потоки. **Колка-2002 считалась на classic 3G.**
- **Авторизация (деплой завершён 2026-09-22):** Telegram-бот `@web_r_avaflow_bot`, бот-флоу входа (deep-link + одноразовый HMAC-код, 10 мин), сессия — HS256-JWT в httpOnly-cookie (30 дней). **Поллер бота — на RPi4** `10.1.0.30` (systemd `ravaflow-tg-bot`, ssh `kosty@10.1.0.30`, логи `journalctl -u ravaflow-tg-bot`), потому что **RGT-PC не достаёт api.telegram.org** (грабля №10). Контейнеры на RGT-PC: `TG_BOT_POLLING=false`, проверяют токены общим `TG_AUTH_SECRET` (stateless; секрет: прод-compose + RPi4-сервис + копия `%TEMP%\prod-tg-secret.txt` на воркстации). Админы `TG_ADMIN_IDS=1049276038,262857249` видят все проекты (группировка по юзеру); легаси-проекты без владельца — только админы. Пользователи/владельцы: `/data/projects/.ravaflow-auth.json` в каждом томе отдельно. `PUT /api/run/cpus` — admin-only; остановить симуляцию может владелец или админ; socket.io-логи — в комнату владельца. Код: `web-app/server/src/auth/`, smoke-тест `node scripts/auth-smoke-test.cjs` (после `npm run build`). Секреты в репо не коммитить — `.env` (gitignored).
- **Сборка/CI:** CI (GitHub Actions) с 2026-09-22 собирает `webapp-latest` из master (до этого workflow был сломан с апреля). `webapp-40g-latest` — **только локально** на воркстации разработки (контекст = родитель `D:\r.avaflow.40G`, исходники движка вне репо). Перенос образов на RGT-PC: `docker save | gzip` → чанки **64 МБ** scp по wg1 → склейка → load (200-МБ чанки рвутся). ⚠️ Прод-compose-проект называется **`docker`**, не `ravaflow40g`.

## Канонические внешние источники

- `D:\Kostyanp95-cluster\APPLICATIONS.md` (секции r.avaflow и Docker Desktop RGT-PC) — синхронизировать при изменениях деплоя.
- `deploy/README.md` — полные грабли №1–9, секция авторизации и запись о переносе данных.
