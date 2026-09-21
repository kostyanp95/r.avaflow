// Telegram Bot API client + login-bot logic. Plain functions (no Nest DI)
// so the flow can be unit-tested with a fake API client.
//
// Flow ("login through the bot", works on ANY origin — public domain, wg IP
// or localhost — because the browser's origin travels inside the deep link):
//   1. Login page links to https://t.me/<bot>?start=l_<base64url(origin)>.
//   2. User presses Start; Telegram delivers the update to the single
//      container that runs getUpdates polling.
//   3. Bot mints a stateless HMAC login token (10 min TTL) and replies with
//      an inline button "<origin>/tg-callback?token=..." plus the raw token
//      as a copyable code for cross-device logins.
//   4. The browser exchanges the token at whatever origin it is on; the
//      token verifies on any container sharing TG_AUTH_SECRET.
import * as https from 'https';
import { authConfig } from './auth.config';
import { mintLoginToken } from './tokens';

export interface TgApi {
  call(method: string, payload: Record<string, unknown>): Promise<any>;
}

function makeApiForToken(token: string): TgApi {
  return {
    call(method: string, payload: Record<string, unknown>): Promise<any> {
      return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload || {});
        const req = https.request(
          {
            hostname: 'api.telegram.org',
            path: `/bot${token}/${method}`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
            },
            timeout: 35_000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk: string) => (data += chunk));
            res.on('end', () => {
              let parsed: any = null;
              try {
                parsed = JSON.parse(data);
              } catch {
                /* ignore */
              }
              if (res.statusCode === 200 || res.statusCode === 409 || parsed) {
                resolve({ statusCode: res.statusCode, body: parsed });
              } else {
                reject(
                  new Error(
                    `Telegram API ${method} -> HTTP ${res.statusCode}: ${data.slice(0, 200)}`,
                  ),
                );
              }
            });
          },
        );
        req.on('error', reject);
        req.on('timeout', () =>
          req.destroy(new Error(`Telegram API ${method} timeout`)),
        );
        req.write(body);
        req.end();
      });
    },
  };
}

/** Client bound to the configured bot token. */
export const tgApi: TgApi = makeApiForToken(authConfig.botToken);

export interface BotDeps {
  api: TgApi;
  secret: string;
}

const ORIGIN_RE = /^https?:\/\/[a-zA-Z0-9.\-]+(:\d{1,5})?$/;
const START_PAYLOAD_RE = /^l_([A-Za-z0-9_\-]+)$/;

function decodeOriginPayload(payload: string): string | null {
  const match = START_PAYLOAD_RE.exec(payload);
  if (!match) return null;
  let origin: string;
  try {
    origin = Buffer.from(match[1], 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (origin.length > 100 || !ORIGIN_RE.test(origin)) return null;
  return origin;
}

async function sendMessage(
  api: TgApi,
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await api.call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...extra,
  });
}

/** Send the login message for a Telegram user. Exposed for tests. */
export async function sendLoginMessage(
  deps: BotDeps,
  chatId: number,
  user: { id: number; first_name?: string },
  origin: string | null,
): Promise<void> {
  const token = mintLoginToken(
    {
      id: user.id,
      username: undefined,
      firstName: user.first_name,
    },
    deps.secret,
  );
  const name = user.first_name ? `, ${escapeHtml(user.first_name)}` : '';

  if (origin) {
    const url = `${origin}/tg-callback?token=${encodeURIComponent(token)}`;
    await sendMessage(
      deps.api,
      chatId,
      [
        `Здравствуйте${name}! Это бот входа в <b>r.avaflow</b>.`,
        '',
        `Нажмите кнопку ниже — вы вернётесь в браузер уже авторизованным.`,
        `Адрес входа: <code>${escapeHtml(origin)}</code>`,
      ].join('\n'),
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔑 Войти в r.avaflow', url }],
          ],
        },
      },
    );
  } else {
    await sendMessage(
      deps.api,
      chatId,
      [
        `Здравствуйте${name}! Это бот входа в <b>r.avaflow</b>.`,
        '',
        `Откройте веб-приложение и вставьте на странице входа код ниже.`,
      ].join('\n'),
    );
  }

  // Separate message so long-press → Copy grabs only the code.
  await sendMessage(
    deps.api,
    chatId,
    `Код для входа (действителен 10 минут):\n<code>${token}</code>`,
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const HELP_TEXT = [
  'Этот бот служит для входа в веб-приложение <b>r.avaflow</b>.',
  '',
  'Команды:',
  '/start, /login — получить код/ссылку для входа',
  '/help — эта справка',
].join('\n');

/** Handle one bot update. Exposed for tests. */
export async function handleBotUpdate(deps: BotDeps, update: any): Promise<void> {
  const message = update?.message;
  if (!message || !message.text) return;

  const chatId = message.chat?.id;
  const from = message.from;
  if (typeof chatId !== 'number' || !from || from.is_bot) return;

  const text = String(message.text).trim();
  const command = text.split(/[\s@]/, 1)[0].toLowerCase();
  const payload = text.includes(' ') ? text.slice(text.indexOf(' ') + 1).trim() : '';

  if (command === '/start' || command === '/login') {
    const origin = payload ? decodeOriginPayload(payload) : null;
    await sendLoginMessage(deps, chatId, from, origin);
    return;
  }

  if (command === '/help' || command === 'help') {
    await sendMessage(deps.api, chatId, HELP_TEXT);
    return;
  }

  // Friendly default for plain text.
  await sendMessage(
    deps.api,
    chatId,
    'Используйте /login, чтобы получить код для входа в r.avaflow.',
  );
}

let polling = false;

/**
 * Long-polling loop. Telegram allows exactly one concurrent getUpdates per
 * bot token: if another instance is polling (e.g. a second container), we
 * get 409 and back off instead of crashing.
 */
export async function startPolling(deps: BotDeps): Promise<void> {
  if (polling) return;
  polling = true;
  let offset = 0;
  let conflictLoggedAt = 0;

  console.log('[auth] Telegram bot polling started');
  while (polling) {
    try {
      const res = await deps.api.call('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message'],
      });
      if (res?.statusCode === 409) {
        const now = Date.now();
        if (now - conflictLoggedAt > 5 * 60_000) {
          conflictLoggedAt = now;
          console.warn(
            '[auth] getUpdates 409: another bot instance is polling this token; ' +
              'set TG_BOT_POLLING=false on all but one container',
          );
        }
        await sleep(5_000 + Math.random() * 5_000);
        continue;
      }
      if (!res?.body?.ok || !Array.isArray(res.body.result)) {
        await sleep(3_000);
        continue;
      }
      for (const update of res.body.result) {
        offset = Math.max(offset, (update.update_id ?? 0) + 1);
        try {
          await handleBotUpdate(deps, update);
        } catch (err) {
          console.error('[auth] error handling bot update:', (err as Error).message);
        }
      }
    } catch (err) {
      console.error('[auth] getUpdates failed:', (err as Error).message);
      await sleep(5_000);
    }
  }
}

export function stopPolling(): void {
  polling = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
