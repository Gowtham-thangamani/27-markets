import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { ApplyPartnerDto } from './dto';

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async apply(dto: ApplyPartnerDto): Promise<{ id: string }> {
    const app = await this.prisma.partnerApplication.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        country: dto.country,
        company: dto.company,
        website: dto.website,
        audience: dto.audience,
        status: 'PENDING',
      },
    });
    await this.audit.record({ action: 'partner.application.create', entity: 'PartnerApplication', entityId: app.id });
    return { id: app.id };
  }
}
