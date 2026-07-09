import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class ChatSendDto {
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}
