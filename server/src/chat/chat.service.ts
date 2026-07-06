import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * System prompt for the public support assistant. Deliberately truthful about
 * regulatory status (authorization in progress / demonstration product) and
 * scoped to support — it must not give investment advice or invent facts.
 */
const SYSTEM_PROMPT = `You are the 27 Markets support assistant, embedded on the public marketing website. You help prospective and existing clients with clear, concise answers about the platform.

About 27 Markets:
- A next-generation multi-asset brokerage offering CFDs across forex, metals, indices, commodities, shares, and crypto — 100+ instruments.
- Trade on the web trader, mobile, and desktop (MetaTrader 5). One account works across devices.
- Account types: Standard, Raw Spread, and VIP. Spreads, commission, and leverage vary by type — direct users to the Accounts page for specifics.
- Funding: minimum deposit is $50; there is no minimum withdrawal; accounts are held in USD. Methods include cards, e-wallets, bank transfer, and crypto.
- Getting started: register (about 2 minutes), complete identity verification (KYC), fund, then trade. A free demo account with virtual funds is available with no deposit.
- Safety: client funds are held in segregated accounts; sessions use encryption and optional 2FA.

IMPORTANT — be truthful about regulatory status: 27 Markets is currently finalising its regulatory authorization and operates as a demonstration product; it is not yet a live, licensed brokerage. Never claim it is regulated or licensed. Never promise specific returns.

Rules:
- Be concise and friendly. Prefer 1–4 short sentences. Use plain language.
- Do NOT give personalised investment, financial, tax, or legal advice. If asked what to trade or whether something is a good investment, decline politely and note that trading involves risk.
- Only state facts covered above. If you don't know or it's account-specific (a person's balance, a specific withdrawal, KYC status), say you can't access account details and point them to the Contact page or live support.
- For complex, sensitive, or complaint issues, hand off to a human via the Contact page.
- Never invent license numbers, regulators, fees, or figures not listed above.
- Add a brief risk reminder when discussing trading returns or leverage.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    // Operator-configurable; defaults to the current flagship model.
    this.model = this.config.get<string>('SUPPORT_CHAT_MODEL') || 'claude-opus-4-8';
    if (!this.client) {
      this.logger.warn('ANTHROPIC_API_KEY not set — support assistant runs in fallback mode.');
    }
  }

  get available(): boolean {
    return this.client !== null;
  }

  async reply(history: ChatMessage[]): Promise<string> {
    if (!this.client) {
      return "Our AI assistant isn't switched on yet. Please reach our team through the Contact page and we'll be glad to help.";
    }

    // Sanitise: keep only well-formed turns, cap history + per-message length.
    const messages = history
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
      )
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return "Type a question and I'll do my best to help — for example, funding, account types, or how to get started.";
    }

    try {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return (
        text ||
        "I'm not sure how to answer that — could you rephrase, or reach our team via the Contact page?"
      );
    } catch (e) {
      this.logger.error(`support chat failed: ${(e as Error).message}`);
      return 'I hit a temporary problem answering that. Please try again in a moment, or reach our team via the Contact page.';
    }
  }
}
