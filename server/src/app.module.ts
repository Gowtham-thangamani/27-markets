import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { CryptoModule } from './common/crypto.module';
import { EmailModule } from './email/email.module';
import { LoggingInterceptor } from './common/logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { LedgerModule } from './ledger/ledger.module';
import { PaymentsModule } from './payments/payments.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CsrfGuard } from './common/csrf.guard';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { FundsModule } from './funds/funds.module';
import { KycModule } from './kyc/kyc.module';
import { AdminModule } from './admin/admin.module';
import { SettingsModule } from './settings/settings.module';
import { BlogModule } from './blog/blog.module';
import { SupportModule } from './support/support.module';
import { MarketModule } from './market/market.module';
import { TradingModule } from './trading/trading.module';
import { LeadsModule } from './leads/leads.module';
import { PartnersModule } from './partners/partners.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DownloadsModule } from './downloads/downloads.module';
import { EconomicCalendarModule } from './economic-calendar/economic-calendar.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    CryptoModule,
    EmailModule,
    PrismaModule,
    AuditModule,
    LedgerModule,
    PaymentsModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    FundsModule,
    KycModule,
    AdminModule,
    SettingsModule,
    BlogModule,
    SupportModule,
    MarketModule,
    TradingModule,
    LeadsModule,
    PartnersModule,
    ChatModule,
    NotificationsModule,
    DownloadsModule,
    EconomicCalendarModule,
  ],
  controllers: [HealthController],
  providers: [
    // CSRF: reject state-changing requests whose Origin isn't allowlisted (runs first).
    { provide: APP_GUARD, useClass: CsrfGuard },
    // Authentication is on by default everywhere; opt out with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Role checks run globally too (defense-in-depth): a controller that adds
    // @Roles() but forgets @UseGuards(RolesGuard) is still enforced. No-ops on
    // routes without @Roles metadata. Runs after JwtAuthGuard so req.user is set.
    { provide: APP_GUARD, useClass: RolesGuard },
    // Baseline rate limiting on every route.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // PII-safe request logging (method/path/status/duration/userId — never bodies).
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Seed the request context (IP/UA) for every route before guards/handlers.
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
