import { IsEnum, IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';
import { OrderSide, PositionStatus } from '@prisma/client';

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
}

export class ListPositionsQuery {
  @IsEnum(PositionStatus)
  status?: PositionStatus;
}
