import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminCrmController } from './admin-crm.controller';
import { AdminCrmService } from './admin-crm.service';

@Module({
  controllers: [AdminController, AdminCrmController],
  providers: [AdminDashboardService, AdminCrmService],
})
export class AdminModule {}
