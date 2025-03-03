import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        role: data.role, // 'CLIENT' ou 'PROFESSIONAL'
        name: data.name,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updatePasswordReset(
    userId: number,
    data: { passwordResetToken: string; passwordResetExpires: Date },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async findByPasswordResetToken(token: string) {
    return this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    });
  }

  async updatePassword(
    userId: number,
    data: {
      password: string;
      passwordResetToken?: string | null;
      passwordResetExpires?: Date | null;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
