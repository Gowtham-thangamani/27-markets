import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @MinLength(4)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  category!: string;

  @IsEnum(TicketPriority)
  priority!: TicketPriority;

  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  message!: string;
}

export class AddMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}
