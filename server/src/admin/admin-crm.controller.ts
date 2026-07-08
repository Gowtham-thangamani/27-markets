import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LeadStatus, TicketStatus, UserRole, UserStatus } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../common/decorators';
import { STAFF_ROLES } from '../common/roles';
import { AdminCrmService } from './admin-crm.service';
import { NoteDto, ReplyTicketDto, SetClientStatusDto, UpdateLeadDto, UpdateTicketDto } from './crm-dto';

@UseGuards(RolesGuard)
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminCrmController {
  constructor(private readonly crm: AdminCrmService) {}

  @Get('staff')
  staff() {
    return this.crm.listStaff();
  }

  // Clients
  @Get('clients')
  clients(@Query('search') search?: string, @Query('status') status?: string) {
    const valid =
      status && (Object.values(UserStatus) as string[]).includes(status)
        ? (status as UserStatus)
        : undefined;
    return this.crm.listClients(search, valid);
  }

  @Get('clients/:id')
  client(@Param('id') id: string) {
    return this.crm.getClient(id);
  }

  // Blocking/unblocking a client is Admin-only (method-level role overrides the class default).
  @Roles(UserRole.ADMIN)
  @Patch('clients/:id/status')
  setClientStatus(@CurrentUser('id') adminId: string, @Param('id') id: string, @Body() dto: SetClientStatusDto) {
    return this.crm.setClientStatus(adminId, id, dto.status as UserStatus);
  }

  @HttpCode(200)
  @Post('clients/:id/notes')
  addClientNote(@CurrentUser('id') staffId: string, @Param('id') id: string, @Body() dto: NoteDto) {
    return this.crm.addClientNote(staffId, id, dto);
  }

  @Get('kyc-documents')
  kycDocuments() {
    return this.crm.listKycDocuments();
  }

  @Get('referrals/summary')
  referralsSummary() {
    return this.crm.referralSummary();
  }

  @Get('referrals')
  referrals() {
    return this.crm.listReferrals();
  }

  // Leads
  @Get('leads')
  leads(@Query('status') status?: LeadStatus) {
    return this.crm.listLeads(status);
  }

  @Get('leads/:id')
  lead(@Param('id') id: string) {
    return this.crm.getLead(id);
  }

  @Patch('leads/:id')
  updateLead(@CurrentUser('id') staffId: string, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.crm.updateLead(staffId, id, dto);
  }

  @HttpCode(200)
  @Post('leads/:id/notes')
  addLeadNote(@CurrentUser('id') staffId: string, @Param('id') id: string, @Body() dto: NoteDto) {
    return this.crm.addLeadNote(staffId, id, dto);
  }

  // Tickets
  @Get('tickets')
  tickets(@Query('status') status?: TicketStatus) {
    return this.crm.listTickets(status);
  }

  @Get('tickets/:id')
  ticket(@Param('id') id: string) {
    return this.crm.getTicket(id);
  }

  @Patch('tickets/:id')
  updateTicket(@CurrentUser('id') staffId: string, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.crm.updateTicket(staffId, id, dto);
  }

  @HttpCode(200)
  @Post('tickets/:id/reply')
  reply(@CurrentUser('id') staffId: string, @Param('id') id: string, @Body() dto: ReplyTicketDto) {
    return this.crm.replyTicket(staffId, id, dto);
  }
}
