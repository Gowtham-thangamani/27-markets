import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  controllers: [AdminController],
  providers: [AdminDashboardService],
})
export class AdminModule {}
