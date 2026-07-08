import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminCrmController } from './admin-crm.controller';
import { AdminCrmService } from './admin-crm.service';
import { AdminFinanceController } from './admin-finance.controller';
import { AdminFinanceService } from './admin-finance.service';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAccountsService } from './admin-accounts.service';
import { AdminAccountTypesController } from './admin-account-types.controller';
import { AdminAccountTypesService } from './admin-account-types.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminStaffController } from './admin-staff.controller';
import { AdminStaffService } from './admin-staff.service';
import { AdminPartnersController } from './admin-partners.controller';
import { AdminPartnersService } from './admin-partners.service';

@Module({
  controllers: [
    AdminController,
    AdminCrmController,
    AdminFinanceController,
    AdminAccountsController,
    AdminAccountTypesController,
    AdminReportsController,
    AdminStaffController,
    AdminPartnersController,
  ],
  providers: [
    AdminDashboardService,
    AdminCrmService,
    AdminFinanceService,
    AdminAccountsService,
    AdminAccountTypesService,
    AdminReportsService,
    AdminStaffService,
    AdminPartnersService,
  ],
})
export class AdminModule {}
