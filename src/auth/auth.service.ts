import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
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
import { BusinessInfoService } from 'src/settings/business-info/business-info.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly businessInfoService: BusinessInfoService,
    private readonly templateService?: NotificationTemplatesService,
  ) {}

  async register(data: any) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new BadRequestException('Usuário já existe');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.create({
      ...data,
      password: hashedPassword,
    });

    await this.notificationsService.createNotificationPreference(user.id, {
      enableEmailNotifications: true,
      enableSmsNotifications: false,
      appointmentReminders: true,
      reminderTime: 24,
    });

    return user;
  }

  async login(data: any, requiredRole?: UserRole) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (requiredRole && user.role !== requiredRole) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(data.password, user.password);

    if (!passwordValid) {
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

    // Buscar usuário
    const user = await this.usersService.findByEmail(data.email);

    if (!user) {
      this.logger.log(`Usuário não encontrado para email: ${data.email}`);
      // Não informamos ao usuário se o email não existe para evitar enumeração
      return {
        success: true,
        message:
          'Se o email existir em nossa base de dados, um link de recuperação será enviado.',
      };
    }

    this.logger.log(`Usuário encontrado: ${user.id} (${user.name})`);

    // Gera token aleatório
    const token = randomBytes(20).toString('hex');
    this.logger.log(`Token gerado: ${token}`);

    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1); // válido por 1 hora

    // Atualiza o token no banco
    this.logger.log(
      `Atualizando token de recuperação para usuário: ${user.id}`,
    );
    await this.usersService.updatePasswordReset(user.id, {
      passwordResetToken: token,
      passwordResetExpires: expiration,
    });

    // Definir rota correta com base no tipo de usuário
    const userTypeRoute = user.role === 'CLIENT' ? 'client' : 'admin';
    this.logger.log(
      `Rota definida para tipo de usuário ${user.role}: ${userTypeRoute}`,
    );

    try {
      // Obter informações do negócio
      const businessInfo = await this.businessInfoService.getBusinessInfo();

      // Construir o link de recuperação
      const baseUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const resetLink = `${baseUrl}/${userTypeRoute}/reset-password?token=${token}`;
      this.logger.log(`Link de recuperação: ${resetLink}`);

      // Usar o serviço de templates para obter o modelo personalizado
      let subject = `Recuperação de Senha - ${businessInfo.name}`;
      let content = `
        Olá ${user.name},

        Recebemos sua solicitação para redefinir sua senha.

        Por favor, clique no link abaixo ou copie-o para seu navegador para criar uma nova senha:

        ${resetLink}

        Este link expira em 1 hora.

        Se você não solicitou esta redefinição de senha, ignore este e-mail e sua senha permanecerá a mesma.

        Atenciosamente,
        Equipe ${businessInfo.name}
      `;

      try {
        // Tentar obter template personalizado de senha, se existir
        if (this.templateService) {
          const template =
            await this.templateService.findTemplateByPurpose(
              'PASSWORD_RECOVERY',
            );

          if (template) {
            // Processar o template com os dados do usuário e negócio
            const processedTemplate = this.templateService.processTemplate(
              template,
              {
                client: user,
                business: businessInfo,
                resetLink: resetLink,
              },
            );

            subject = processedTemplate.subject;
            content = processedTemplate.content;

            this.logger.log(
              'Template personalizado de recuperação de senha aplicado',
            );
          }
        }
      } catch (templateError) {
        // Se houver erro ao obter o template, prosseguir com o conteúdo padrão
        this.logger.error(
          `Erro ao obter template de recuperação de senha: ${templateError.message}`,
          templateError.stack,
        );
      }

      // Criar notificação
      const notification = await this.notificationsService.createNotification({
        userId: user.id,
        type: 'PASSWORD_RECOVERY',
        channel: 'EMAIL',
        title: subject,
        content,
        scheduledFor: new Date(),
      });

      // Processar a notificação
      const emailResult = await this.notificationsService.processNotification(
        notification.id,
      );

      return {
        success: true,
        message:
          'Email de recuperação enviado. Por favor, verifique sua caixa de entrada.',
      };
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email de recuperação: ${error.message}`,
        error.stack,
      );
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

  async verifyResetToken(token: string) {
    const user = await this.usersService.findByPasswordResetToken(token);
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
}
