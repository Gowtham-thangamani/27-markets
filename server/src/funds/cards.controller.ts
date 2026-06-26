import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators';
import { CardsService } from './cards.service';
import { AddCardDto, CardDepositDto } from './cards.dto';

/** Saved (tokenized) cards for one-click deposits. */
@Controller('funds/cards')
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.cards.list(userId);
  }

  @HttpCode(200)
  @Post()
  add(@CurrentUser('id') userId: string, @Body() dto: AddCardDto) {
    return this.cards.add(userId, dto);
  }

  @HttpCode(200)
  @Post(':id/deposit')
  deposit(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: CardDepositDto) {
    return this.cards.deposit(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.cards.remove(userId, id);
  }
}
