import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { UserRole } from '@prisma/client';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/professional')
  async registerProfessional(@Body() data: any) {
    data.role = 'PROFESSIONAL';
    return this.authService.register(data);
  }

  @Post('register/client')
  async registerClient(@Body() data: any) {
    data.role = 'CLIENT';
    return this.authService.register(data);
  }

  @Post('login/professional')
  async loginProfessional(@Body() body: any) {
    return this.authService.loginProfessional(body);
  }

  @Post('login/client')
  async loginClient(@Body() body: any) {
    return this.authService.loginClient(body);
  }

  @Post('recover-password/client')
  async recoverClientPassword(@Body() data: RecoverPasswordDto) {
    data.userType = UserRole.CLIENT;
    return this.authService.recoverPassword(data);
  }

  @Post('recover-password/professional')
  async recoverProfessionalPassword(@Body() data: RecoverPasswordDto) {
    data.userType = UserRole.PROFESSIONAL;
    return this.authService.recoverPassword(data);
  }

  @Get('verify-reset-token')
  async verifyResetToken(@Query() query: VerifyTokenDto) {
    return this.authService.verifyResetToken(query);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authService.resetPassword(data);
  }
}
