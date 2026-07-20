import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { formatMoney, toMoney } from '../ledger/money';
import { substituteTokens } from '../common/tokens';
import { manualTokens, needsAccount, slugify } from './document-vars';
import { renderPdf, simulationFooter } from './pdf-renderer';
import type { GenerateDocumentDto } from './document-dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  /** Tell the UI what it must ask the admin for before generating. */
  async prepare(templateId: string, clientId: string, accountId?: string) {
    const tpl = await this.loadTemplate(templateId);
    const needs = needsAccount(tpl.body);
    return {
      autoVars: await this.resolveAutoVars(clientId, needs ? accountId : undefined),
      manualTokens: manualTokens(tpl.body),
      needsAccount: needs,
    };
  }

  /** Render the template to a PDF buffer and record who issued it. */
  async generate(adminId: string, dto: GenerateDocumentDto) {
    const tpl = await this.loadTemplate(dto.templateId);
    const needs = needsAccount(tpl.body);
    if (needs && !dto.accountId) {
      throw new BadRequestException('Select a trading account for this template.');
    }

    const auto = await this.resolveAutoVars(dto.clientId, needs ? dto.accountId : undefined);
    // Auto values are spread last: an admin-supplied `balance` must never win
    // over the ledger's figure.
    const vars = { ...(dto.vars ?? {}), ...auto };

    const buffer = await renderPdf({
      title: tpl.name,
      body: substituteTokens(tpl.body, vars),
      footerNote: simulationFooter(this.config.get<string>('TRADING_MODE')),
      generatedAt: new Date(),
    });

    // Audited only after a successful render, so a failure leaves no phantom
    // "document issued" entry in the trail.
    await this.audit.record({
      userId: adminId,
      action: 'documents.generate',
      entity: 'TextTemplate',
      entityId: tpl.id,
      metadata: { clientId: dto.clientId, accountId: dto.accountId ?? null, template: tpl.name },
    });

    const date = new Date().toISOString().slice(0, 10);
    return { buffer, filename: `${slugify(tpl.name)}-${slugify(auto.clientName)}-${date}.pdf` };
  }

  private async loadTemplate(templateId: string) {
    const tpl = await this.prisma.textTemplate.findUnique({ where: { id: templateId } });
    if (!tpl) throw new NotFoundException('Template not found');
    if (tpl.kind !== 'PDF') throw new BadRequestException('Template is not a PDF template');
    if (!tpl.enabled) throw new BadRequestException('Template is disabled');
    return tpl;
  }

  private async resolveAutoVars(clientId: string, accountId?: string): Promise<Record<string, string>> {
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const vars: Record<string, string> = {
      clientName: `${client.firstName} ${client.lastName}`,
      clientEmail: client.email,
      date: new Date().toISOString().slice(0, 10),
    };

    if (accountId) {
      const account = await this.prisma.tradingAccount.findUnique({
        where: { id: accountId },
        select: { id: true, userId: true, number: true, currency: true, ledgerAccount: { select: { id: true } } },
      });
      // Ownership check: without it, staff could render another client's
      // balance onto this client's statement.
      if (!account || account.userId !== clientId) {
        throw new BadRequestException('Account does not belong to this client');
      }
      vars.accountNumber = account.number;
      vars.currency = account.currency;
      vars.balance = formatMoney(
        account.ledgerAccount ? await this.ledger.balanceOf(account.ledgerAccount.id) : toMoney(0),
      );
    }

    return vars;
  }
}
