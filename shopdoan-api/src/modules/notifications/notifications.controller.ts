import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { PaginationDto } from '@/common/pagination.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMine(@Query() pagination: PaginationDto, @CurrentUser() user: any) {
    return this.notificationsService.findMine(this.userId(user), pagination);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: any) {
    return this.notificationsService.unreadCount(this.userId(user));
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.notificationsService.markRead(id, this.userId(user));
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(this.userId(user));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.notificationsService.remove(id, this.userId(user));
  }

  @Post('admin/users/:userId')
  @Roles('admin', 'root')
  createForUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body()
    body: {
      title: string;
      message: string;
      type?: string;
      actionUrl?: string;
      metadata?: unknown;
    },
  ) {
    return this.notificationsService.createForUser(userId, body);
  }

  private userId(user: any) {
    return Number(user?.userId || user?.sub || user?.id);
  }
}
