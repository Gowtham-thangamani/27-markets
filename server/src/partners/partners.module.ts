import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { AdminPartnerApplicationsController } from './admin-partners-applications.controller';
import { PartnerPortalController } from './partner-portal.controller';
import { PartnerPortalService } from './partner-portal.service';

@Module({
  controllers: [PartnersController, AdminPartnerApplicationsController, PartnerPortalController],
  providers: [PartnersService, PartnerPortalService],
  exports: [PartnersService],
})
export class PartnersModule {}
