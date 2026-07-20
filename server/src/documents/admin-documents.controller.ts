import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { DocumentsService } from './documents.service';
import { GenerateDocumentDto, PrepareDocumentDto } from './document-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin/documents')
export class AdminDocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('prepare')
  prepare(@Query() q: PrepareDocumentDto) {
    return this.documents.prepare(q.templateId, q.clientId, q.accountId);
  }

  @Post('generate')
  async generate(
    @CurrentUser('id') adminId: string,
    @Body() dto: GenerateDocumentDto,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.documents.generate(adminId, dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }
}
