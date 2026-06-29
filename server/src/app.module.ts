import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { FundsModule } from './funds/funds.module';
import { KycModule } from './kyc/kyc.module';
import { AdminModule } from './admin/admin.module';
import { BlogModule } from './blog/blog.module';
import { SupportModule } from './support/support.module';
import { MarketModule } from './market/market.module';
import { TradingModule } from './trading/trading.module';
import { LeadsModule } from './leads/leads.module';
import { PartnersModule } from './partners/partners.module';
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
    BlogModule,
    SupportModule,
    MarketModule,
    TradingModule,
    LeadsModule,
    PartnersModule,
  ],
  controllers: [HealthController],
  providers: [
    // Authentication is on by default everywhere; opt out with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Baseline rate limiting on every route.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // PII-safe request logging (method/path/status/duration/userId — never bodies).
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
