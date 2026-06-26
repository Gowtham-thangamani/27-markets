import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { OrderSide, OrderType, PositionStatus } from '@prisma/client';

export class PlaceOrderDto {
  @IsString()
  accountId!: string;

  @IsString()
  @MaxLength(40)
  symbol!: string;

  @IsEnum(OrderSide)
  side!: OrderSide;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType; // defaults to MARKET

  // Required for LIMIT/STOP orders.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  triggerPrice?: number;
}

export class ListPositionsQuery {
  @IsEnum(PositionStatus)
  status?: PositionStatus;
}

export class ClosePositionDto {
  // Omit or pass the full size for a full close; a smaller value closes partially.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;
}

export class SetProtectionDto {
  // null clears the level; a number sets it; undefined leaves it unchanged.
  @IsOptional()
  @IsNumber()
  takeProfit?: number | null;

  @IsOptional()
  @IsNumber()
  stopLoss?: number | null;
}
