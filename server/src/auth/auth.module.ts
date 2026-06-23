import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [JwtModule.register({}), LeadsModule],
  controllers: [AuthController],
  providers: [AuthService, TokensService],
  exports: [TokensService, AuthService],
})
export class AuthModule {}
