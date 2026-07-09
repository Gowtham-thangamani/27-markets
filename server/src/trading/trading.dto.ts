import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength } from 'class-validator';
import { OrderSide, OrderType, PositionStatus } from '@prisma/client';

/** Sanity ceiling on order size — blocks absurd/overflow volumes server-side. */
const MAX_ORDER_QUANTITY = 1_000_000;

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
  @Max(MAX_ORDER_QUANTITY)
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

export class ConnectMt5Dto {
  @IsString()
  @MaxLength(40)
  login!: string;

  @IsString()
  @MaxLength(128)
  password!: string;

  @IsString()
  @MaxLength(80)
  server!: string;
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

export class ModifyOrderDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  triggerPrice?: number;

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
