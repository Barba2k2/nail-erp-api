import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { UserRole } from '@prisma/client';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthExceptionFilter } from './filtes/auth-exception.filter';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/professional')
  @UseGuards(ThrottlerGuard)
  async registerProfessional(@Body() data: RegisterDto) {
    data.role = UserRole.PROFESSIONAL;
    return this.authService.register(data);
  }

  @Post('register/client')
  @UseGuards(ThrottlerGuard)
  async registerClient(@Body() data: RegisterDto) {
    data.role = UserRole.CLIENT;
    return this.authService.register(data);
  }

  @Post('login/professional')
  @UseGuards(ThrottlerGuard)
  async loginProfessional(@Body() body: LoginDto) {
    return this.authService.login(body, UserRole.PROFESSIONAL);
  }

  @Post('login/client')
  @UseGuards(ThrottlerGuard)
  async loginClient(@Body() body: LoginDto) {
    return this.authService.login(body, UserRole.CLIENT);
  }

  @Post('recover-password/client')
  @UseGuards(ThrottlerGuard)
  async recoverClientPassword(@Body() data: RecoverPasswordDto) {
    data.userType = UserRole.CLIENT;
    return this.authService.recoverPassword(data);
  }

  @Post('recover-password/professional')
  @UseGuards(ThrottlerGuard)
  async recoverProfessionalPassword(@Body() data: RecoverPasswordDto) {
    data.userType = UserRole.PROFESSIONAL;
    return this.authService.recoverPassword(data);
  }

  @Get('verify-reset-token')
  async verifyResetToken(@Query() query: VerifyTokenDto) {
    return this.authService.verifyResetToken(query.token);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data);
  }
}
