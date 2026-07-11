import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AgentService } from './agent.service';
import { CurrentUser, Roles } from '../common/decorators';
import { RolesGuard } from '../auth/guards/roles.guard';

/** Agent workspace — each agent sees only their own assigned book. */
@UseGuards(RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
@Controller('agent')
export class AgentController {
  constructor(private readonly agent: AgentService) {}

  @Get('summary')
  summary(@CurrentUser('id') userId: string) {
    return this.agent.summary(userId);
  }

  @Get('leads')
  leads(@CurrentUser('id') userId: string) {
    return this.agent.myLeads(userId);
  }

  @Get('tickets')
  tickets(@CurrentUser('id') userId: string) {
    return this.agent.myTickets(userId);
  }
}
