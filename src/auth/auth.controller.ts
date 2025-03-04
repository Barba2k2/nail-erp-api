import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

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

  @Post('recover-password')
  async recoverPassword(@Body('email') email: string) {
    return this.authService.recoverPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    const { token, newPassword } = body;
    return this.authService.resetPassword(token, newPassword);
  }
}
