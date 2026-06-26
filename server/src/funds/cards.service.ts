import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FundsService } from './funds.service';
import type { AddCardDto, CardDepositDto } from './cards.dto';

interface SavedCardView {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

/**
 * Saved (tokenized) cards for one-click repeat deposits. The raw card number/CVV
 * is NEVER stored — only display metadata + the PSP token. Charging a saved card
 * goes through Stripe off-session at go-live; in SIMULATION it credits inline.
 */
@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly funds: FundsService,
  ) {}

  private toView(c: { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean }): SavedCardView {
    return { id: c.id, brand: c.brand, last4: c.last4, expMonth: c.expMonth, expYear: c.expYear, isDefault: c.isDefault };
  }

  async list(userId: string): Promise<SavedCardView[]> {
    const cards = await this.prisma.savedCard.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return cards.map((c) => this.toView(c));
  }

  async add(userId: string, dto: AddCardDto): Promise<SavedCardView> {
    const count = await this.prisma.savedCard.count({ where: { userId } });
    const card = await this.prisma.savedCard.create({
      data: {
        userId,
        brand: dto.brand.toLowerCase(),
        last4: dto.last4,
        expMonth: dto.expMonth,
        expYear: dto.expYear,
        isDefault: count === 0,
      },
    });
    await this.audit.record({ userId, action: 'cards.add', entity: 'SavedCard', entityId: card.id, metadata: { brand: card.brand, last4: card.last4 } });
    return this.toView(card);
  }

  async remove(userId: string, id: string) {
    const card = await this.prisma.savedCard.findUnique({ where: { id } });
    if (!card || card.userId !== userId) throw new NotFoundException('Card not found');
    await this.prisma.savedCard.delete({ where: { id } });
    await this.audit.record({ userId, action: 'cards.remove', entity: 'SavedCard', entityId: id });
    return { ok: true };
  }

  /** Deposit using a saved card. Stripe off-session at go-live; simulated credit now. */
  async deposit(userId: string, id: string, dto: CardDepositDto) {
    const card = await this.prisma.savedCard.findUnique({ where: { id } });
    if (!card || card.userId !== userId) throw new NotFoundException('Card not found');
    return this.funds.deposit(userId, { accountId: dto.accountId, amount: dto.amount, method: `Card ••${card.last4}` } as never);
  }
}
