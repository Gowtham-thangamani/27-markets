import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { VerifyReminderTask } from './verify-reminder.task';
import { LeadsModule } from '../leads/leads.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [JwtModule.register({}), LeadsModule, AccountsModule],
  controllers: [AuthController],
  providers: [AuthService, TokensService, VerifyReminderTask],
  exports: [TokensService, AuthService],
})
export class AuthModule {}
