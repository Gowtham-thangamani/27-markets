import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateDataChangeRequestDto, UpdateProfileDto } from './dto';
import { CurrentUser } from '../common/decorators';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  profile(@CurrentUser('id') userId: string) {
    return this.users.profile(userId);
  }

  @Patch('me')
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.update(userId, dto);
  }

  @Get('me/change-requests')
  changeRequests(@CurrentUser('id') userId: string) {
    return this.users.listMyChangeRequests(userId);
  }

  @Post('me/change-requests')
  submitChangeRequest(@CurrentUser('id') userId: string, @Body() dto: CreateDataChangeRequestDto) {
    return this.users.createChangeRequest(userId, dto);
  }
}
