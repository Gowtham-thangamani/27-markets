import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, type RequestContext } from './auth.service';
import { RegisterDto, LoginDto, TotpVerifyDto, ChangePasswordDto } from './dto';
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE_NAME } from './cookies';
import { CurrentUser, Public } from '../common/decorators';
import type { Env } from '../config/env.validation';

function ctxFrom(req: Request): RequestContext {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.register(dto, ctxFrom(req));
    setAuthCookies(res, tokens, this.config);
    return { user };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.login(dto, ctxFrom(req));
    setAuthCookies(res, tokens, this.config);
    return { user };
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    const token = cookies?.[REFRESH_COOKIE_NAME];
    const tokens = await this.auth.refresh(token, ctxFrom(req));
    setAuthCookies(res, tokens, this.config);
    return { ok: true };
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    await this.auth.logout(cookies?.[REFRESH_COOKIE_NAME]);
    clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }

  @HttpCode(200)
  @Post('password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.auth.changePassword(userId, dto.currentPassword, dto.newPassword, ctxFrom(req));
    return { ok: true };
  }

  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser('id') userId: string) {
    return this.auth.startTwoFactor(userId);
  }

  @HttpCode(200)
  @Post('2fa/enable')
  async enableTwoFactor(@CurrentUser('id') userId: string, @Body() dto: TotpVerifyDto, @Req() req: Request) {
    await this.auth.enableTwoFactor(userId, dto.code, ctxFrom(req));
    return { ok: true };
  }

  @HttpCode(200)
  @Post('2fa/disable')
  async disableTwoFactor(@CurrentUser('id') userId: string, @Req() req: Request) {
    await this.auth.disableTwoFactor(userId, ctxFrom(req));
    return { ok: true };
  }
}
