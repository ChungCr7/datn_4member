import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '@/auth/decorators/roles.decorator';

type AuthRequest = {
  user: {
    id: number;
    sub: number;
    role: string;
  };
};

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('admin', 'root')
  async create(
    @Body() createUserDto: CreateUserDto,
    @Req() request: AuthRequest,
  ) {
    const user = request.user;
    return this.usersService.create(
      createUserDto,
      user.sub || user.id,
      user.role,
    );
  }

  @Get()
  @ApiBearerAuth()
  @Roles('admin', 'root')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    return this.usersService.findAll({
      page: pageNum,
      limit: limitNum,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
  }

  @Get('profile')
  @ApiBearerAuth()
  async getProfile(@Req() request: AuthRequest) {
    const user = request.user;
    return this.usersService.findOne(user.sub || user.id);
  }

  @Patch('profile')
  @ApiBearerAuth()
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthRequest,
  ) {
    const user = request.user;
    return this.usersService.update(
      user.sub || user.id,
      updateUserDto,
      user.sub || user.id,
      user.role,
    );
  }

  @Patch('profile/image')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async updateProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: AuthRequest,
  ) {
    const user = request.user;
    return this.usersService.updateProfileImage(user.sub || user.id, file);
  }

  @Get('search/by-email')
  @ApiBearerAuth()
  @Roles('admin', 'root')
  async findByEmail(@Query('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles('admin', 'root')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('admin', 'root')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthRequest,
  ) {
    const user = request.user;
    return this.usersService.update(
      id,
      updateUserDto,
      user.sub || user.id,
      user.role,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('admin', 'root')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    const user = request.user;
    return this.usersService.remove(id, user.sub || user.id, user.role);
  }
}
