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
