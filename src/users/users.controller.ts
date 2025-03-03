import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/decorator/roles.guard';
import { Roles } from 'src/auth/decorator/roler.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PROFESSIONAL')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Post()
  async create(@Body() data: any) {
    return this.userService.create(data);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.userService.findOne(id);
  }
}
