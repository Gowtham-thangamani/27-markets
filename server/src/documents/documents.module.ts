import { Module } from '@nestjs/common';
import { AdminDocumentsController } from './admin-documents.controller';
import { DocumentsService } from './documents.service';

// Prisma, Ledger, Audit and Config are all global modules — no imports needed.
@Module({
  controllers: [AdminDocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
