import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminCrmController } from './admin-crm.controller';
import { AdminCrmService } from './admin-crm.service';
import { AdminFinanceController } from './admin-finance.controller';
import { AdminFinanceService } from './admin-finance.service';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAccountsService } from './admin-accounts.service';

@Module({
  controllers: [AdminController, AdminCrmController, AdminFinanceController, AdminAccountsController],
  providers: [AdminDashboardService, AdminCrmService, AdminFinanceService, AdminAccountsService],
})
export class AdminModule {}
