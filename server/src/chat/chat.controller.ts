import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { ChatService, type ChatMessage } from './chat.service';

/**
 * Public support-assistant endpoint. Anonymous visitors can chat; a tighter
 * rate limit than the global default guards against abuse of the LLM call.
 */
@Controller('support-chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  async send(@Body() body: { messages?: ChatMessage[] }) {
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const reply = await this.chat.reply(messages);
    return { reply, available: this.chat.available };
  }
}
