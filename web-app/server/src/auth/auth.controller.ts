import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from './auth.decorators';
import { authConfig } from './auth.config';
import { AuthService, AuthUser } from './auth.service';
import { SESSION_COOKIE, verifyLoginToken, verifyTelegramLoginWidget } from './tokens';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Public: the login page needs to know the mode and the bot handle. */
  @Public()
  @Get('config')
  getConfig(): { enabled: boolean; botUsername: string | null } {
    return {
      enabled: authConfig.enabled,
      botUsername: authConfig.botUsername || null,
    };
  }

  @Get('me')
  getMe(@Req() req: Request): { user: AuthUser | null; enabled: boolean } {
    return {
      user: (req as any).user ?? null,
      enabled: authConfig.enabled,
    };
  }

  /** Exchange a one-time Telegram bot token (link click or pasted code). */
  @Public()
  @Post('tg/exchange')
  @HttpCode(200)
  exchangeToken(
    @Body() body: { token?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): { user: AuthUser } {
    const tg = body?.token ? verifyLoginToken(body.token, authConfig.secret) : null;
    if (!tg) {
      throw new UnauthorizedException('Invalid or expired login code');
    }
    if (!authConfig.isAllowed(tg.id)) {
      throw new ForbiddenException('This account is not allowed to use this service');
    }
    const { token, user } = this.authService.establishSession(tg);
    res.cookie(SESSION_COOKIE, token, this.authService.sessionCookieOptions(req));
    return { user };
  }

  /**
   * Official Telegram Login Widget callback (forward-compatible path).
   * Requires the domain to be authorized in BotFather; the bot-code flow
   * above has no such requirement, which is why it is the default here.
   */
  @Public()
  @Post('tg/widget')
  @HttpCode(200)
  loginWidget(
    @Body() body: Record<string, any>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): { user: AuthUser } {
    const tg = verifyTelegramLoginWidget(authConfig.botToken, body || {});
    if (!tg) {
      throw new UnauthorizedException('Invalid Telegram widget signature');
    }
    if (!authConfig.isAllowed(tg.id)) {
      throw new ForbiddenException('This account is not allowed to use this service');
    }
    const { token, user } = this.authService.establishSession(tg);
    res.cookie(SESSION_COOKIE, token, this.authService.sessionCookieOptions(req));
    return { user };
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }
}
