import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { BlogService } from './blog.service';
import { CreatePostDto, ListPostsQuery, UpdatePostDto } from './dto';
import { CurrentUser, Public, Roles } from '../common/decorators';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller()
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  // ───────────── Public reads ─────────────

  @Public()
  @Get('blog')
  list(@Query() q: ListPostsQuery) {
    return this.blog.listPublished(q);
  }

  @Public()
  @Get('blog/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.blog.getPublishedBySlug(slug);
  }

  // ───────────── Admin CRUD (ADMIN only) ─────────────

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/blog')
  adminList() {
    return this.blog.listAll();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/blog/:id')
  adminGet(@Param('id') id: string) {
    return this.blog.getById(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/blog')
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePostDto) {
    return this.blog.create(userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('admin/blog/:id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.blog.update(userId, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/blog/:id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.blog.remove(userId, id);
  }
}
