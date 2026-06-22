import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto';
import { CurrentUser } from '../common/decorators';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.accounts.list(userId);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.accounts.get(userId, id);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAccountDto) {
    return this.accounts.create(userId, dto.type, dto.mode);
  }
}
