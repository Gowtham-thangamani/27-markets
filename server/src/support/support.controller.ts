import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateTicketDto, AddMessageDto } from './dto';
import { CurrentUser } from '../common/decorators';

@Controller('support/tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.support.listMine(userId);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.support.getMine(userId, id);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTicketDto) {
    return this.support.create(userId, dto);
  }

  @HttpCode(200)
  @Post(':id/messages')
  reply(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: AddMessageDto) {
    return this.support.addMessage(userId, id, dto);
  }
}
