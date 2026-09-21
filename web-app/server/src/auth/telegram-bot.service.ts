import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { authConfig } from './auth.config';
import {
  BotDeps,
  handleBotUpdate,
  startPolling,
  stopPolling,
  tgApi,
  TgApi,
} from './telegram-bot';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private deps: BotDeps = { api: tgApi, secret: authConfig.secret };

  async onModuleInit(): Promise<void> {
    if (!authConfig.botToken) return;

    // Resolve the bot username (needed for t.me deep links) even when this
    // container does not poll.
    if (!authConfig.botUsername) {
      try {
        const res: any = await (tgApi as TgApi).call('getMe', {});
        if (res?.body?.ok && res.body.result?.username) {
          authConfig.botUsername = res.body.result.username;
          console.log(`[auth] Telegram bot @${authConfig.botUsername} connected`);
        } else {
          console.error('[auth] getMe failed:', JSON.stringify(res?.body).slice(0, 200));
        }
      } catch (err) {
        console.error('[auth] getMe failed:', (err as Error).message);
      }
    }

    if (authConfig.botPolling) {
      try {
        await (tgApi as TgApi).call('setMyCommands', {
          commands: [
            { command: 'start', description: 'Войти в r.avaflow' },
            { command: 'login', description: 'Получить код для входа' },
            { command: 'help', description: 'Справка' },
          ],
        });
      } catch {
        /* cosmetic only */
      }
      // Fire-and-forget: the loop must not block bootstrap.
      startPolling(this.deps).catch((err) =>
        console.error('[auth] polling loop crashed:', (err as Error).message),
      );
    }
  }

  onModuleDestroy(): void {
    stopPolling();
  }

  /** Test hook. */
  handleUpdate(update: unknown): Promise<void> {
    return handleBotUpdate(this.deps, update);
  }
}
