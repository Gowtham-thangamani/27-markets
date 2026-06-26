import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import type { PositionStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators';
import { TradingService } from './trading.service';
import { ClosePositionDto, ModifyOrderDto, PlaceOrderDto, SetProtectionDto } from './trading.dto';

/** Client trading endpoints (authenticated). Demo execution today; MT5 at go-live. */
@Controller('trading')
export class TradingController {
  constructor(private readonly trading: TradingService) {}

  @HttpCode(200)
  @Post('orders')
  place(@CurrentUser('id') userId: string, @Body() dto: PlaceOrderDto) {
    return this.trading.placeOrder(userId, dto);
  }

  @Get('orders')
  orders(@CurrentUser('id') userId: string) {
    return this.trading.listOrders(userId);
  }

  @Get('margin')
  margin(@CurrentUser('id') userId: string, @Query('accountId') accountId: string) {
    return this.trading.getMargin(userId, accountId);
  }

  @HttpCode(200)
  @Post('orders/:id/modify')
  modify(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: ModifyOrderDto) {
    return this.trading.modifyOrder(userId, id, dto);
  }

  @HttpCode(200)
  @Post('orders/:id/cancel')
  cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.trading.cancelOrder(userId, id);
  }

  @HttpCode(200)
  @Post('accounts/:id/reset')
  reset(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.trading.resetDemo(userId, id);
  }

  @Get('positions')
  positions(@CurrentUser('id') userId: string, @Query('status') status?: PositionStatus) {
    return this.trading.listPositions(userId, status);
  }

  @HttpCode(200)
  @Post('positions/:id/close')
  close(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: ClosePositionDto) {
    return this.trading.closePosition(userId, id, dto.quantity);
  }

  @HttpCode(200)
  @Post('positions/:id/protection')
  protect(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: SetProtectionDto) {
    return this.trading.setProtection(userId, id, dto);
  }
}
