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
import { AdminPaymentGatewaysController } from './admin-payment-gateways.controller';
import { AdminPaymentGatewaysService } from './admin-payment-gateways.service';
import { AdminNotificationTemplatesController } from './admin-notification-templates.controller';
import { AdminNotificationTemplatesService } from './admin-notification-templates.service';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';
import { AdminServersController } from './admin-servers.controller';
import { AdminServersService } from './admin-servers.service';
import { AdminPaymentMethodTypesController } from './admin-payment-method-types.controller';
import { AdminPaymentMethodTypesService } from './admin-payment-method-types.service';
import { AdminExchangeRatesController } from './admin-exchange-rates.controller';
import { AdminExchangeRatesService } from './admin-exchange-rates.service';
import { AdminKycFieldsController } from './admin-kyc-fields.controller';
import { AdminKycFieldsService } from './admin-kyc-fields.service';
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
    AdminPaymentGatewaysController,
    AdminNotificationTemplatesController,
    AdminSettingsController,
    AdminServersController,
    AdminPaymentMethodTypesController,
    AdminExchangeRatesController,
    AdminKycFieldsController,
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
    AdminPaymentGatewaysService,
    AdminNotificationTemplatesService,
    AdminSettingsService,
    AdminServersService,
    AdminPaymentMethodTypesService,
    AdminExchangeRatesService,
    AdminKycFieldsService,
    AdminReportsService,
    AdminStaffService,
    AdminPartnersService,
  ],
})
export class AdminModule {}
