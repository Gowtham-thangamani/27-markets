import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto';
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
}
