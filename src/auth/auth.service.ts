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
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { NotificationTemplatesService } from 'src/notifications/template/notification-templates.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly templateService?: NotificationTemplatesService,
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

  async recoverPassword(data: RecoverPasswordDto) {
    // Busca por email com filtro opcional de tipo de usuário
    const query: any = { email: data.email };

    // Se um tipo de usuário específico for fornecido, adiciona ao filtro
    if (data.userType) {
      query.role = data.userType;
    }

    const user = await this.usersService.findByEmail(data.email);

    if (!user) {
      // Não informamos ao usuário se o email não existe para evitar enumeração
      return {
        success: true,
        message:
          'Se o email existir em nossa base de dados, um link de recuperação será enviado.',
      };
    }

    // Gera token aleatório
    const token = randomBytes(20).toString('hex');
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1); // válido por 1 hora

    await this.usersService.updatePasswordReset(user.id, {
      passwordResetToken: token,
      passwordResetExpires: expiration,
    });

    // Definir rota correta com base no tipo de usuário
    const userTypeRoute = user.role === 'CLIENT' ? 'client' : 'admin';

    try {
      // Construir o link de recuperação com a rota específica para o tipo de usuário
      const baseUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const resetLink = `${baseUrl}/${userTypeRoute}/reset-password?token=${token}`;

      // Criamos o conteúdo manualmente ao invés de usar o sistema de templates
      // isso garante que funcione mesmo que o sistema de templates não esteja disponível
      const subject = `Recuperação de Senha - ${this.configService.get<string>('BUSINESS_NAME') || 'Salão de Beleza'}`;
      const content = `
    Olá ${user.name},

    Recebemos sua solicitação para redefinir sua senha.

    Por favor, clique no link abaixo ou copie-o para seu navegador para criar uma nova senha:

    ${resetLink}

    Este link expira em 1 hora.

    Se você não solicitou esta redefinição de senha, ignore este e-mail e sua senha permanecerá a mesma.

    Atenciosamente,
    Equipe ${this.configService.get<string>('BUSINESS_NAME') || 'Salão de Beleza'}
    `;

      // Criar e enviar a notificação
      const notification = await this.notificationsService.createNotification({
        userId: user.id,
        type: 'CUSTOM_MESSAGE',
        channel: 'EMAIL',
        title: subject,
        content,
        scheduledFor: new Date(), // Enviar imediatamente
      });

      // Processar a notificação imediatamente
      await this.notificationsService.processNotification(notification.id);

      return {
        success: true,
        message:
          'Email de recuperação enviado. Por favor, verifique sua caixa de entrada.',
      };
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      // Retornar sucesso mesmo em caso de erro para não expor informações sensíveis
      return {
        success: true,
        message:
          'Se o email existir em nossa base de dados, um link de recuperação será enviado.',
      };
    }
  }

  async resetPassword(data: ResetPasswordDto) {
    if (data.newPassword !== data.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    const user = await this.usersService.findByPasswordResetToken(data.token);
    if (!user) {
      throw new NotFoundException('Token de recuperação inválido ou expirado');
    }

    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      throw new BadRequestException('Token expirado');
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await this.usersService.updatePassword(user.id, {
      password: hashedPassword,
      passwordResetExpires: null,
      passwordResetToken: null,
    });

    return {
      success: true,
      message: 'Senha atualizada com sucesso',
    };
  }

  async verifyResetToken(data: VerifyTokenDto) {
    const user = await this.usersService.findByPasswordResetToken(data.token);
    if (!user) {
      throw new NotFoundException('Token de recuperação inválido ou expirado');
    }

    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      throw new BadRequestException('Token expirado');
    }

    return {
      valid: true,
      email: user.email,
      userType: user.role,
    };
  }
}
