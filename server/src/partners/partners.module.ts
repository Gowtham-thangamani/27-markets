import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { AdminPartnerApplicationsController } from './admin-partners-applications.controller';

@Module({
  controllers: [PartnersController, AdminPartnerApplicationsController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
