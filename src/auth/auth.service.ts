import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.usersService.create({ ...data, password: hashedPassword });
  }

  async login(data: any) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Senha inválida');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
    }
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
    return { access_token: token };
  }

  async loginProfessional(data: any) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user || user.role !== 'PROFESSIONAL') {
      throw new UnauthorizedException('Usuário profissional não encontrado');
    }
    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Senha inválida');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
    }
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
    return { access_token: token };
  }

  async loginClient(data: any) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user || user.role !== 'CLIENT') {
      throw new UnauthorizedException('Usuário cliente não encontrado');
    }
    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Senha inválida');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
    }
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
    return { access_token: token };
  }

  async recoverPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    // Gera token aleatório
    const token = randomBytes(20).toString('hex');
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1); // válido por 1 hora

    await this.usersService.updatePasswordReset(user.id, {
      passwordResetToken: token,
      passwordResetExpires: expiration,
    });

    // Aqui, integre com um serviço de email para enviar o token.
    return { message: 'Email de recuperação enviado', token }; // token para demonstração
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) {
      throw new NotFoundException('Token inválido ou expirado');
    }
    // Verifica se passwordResetExpires está definido e se o token expirou
    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      throw new BadRequestException('Token expirado');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
    return { message: 'Senha atualizada com sucesso' };
  }
}
