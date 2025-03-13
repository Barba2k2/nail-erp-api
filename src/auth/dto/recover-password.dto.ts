import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class RecoverPasswordDto {
  @IsNotEmpty({ message: 'O email é obrigatório' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Tipo de usuário inválido' })
  userType?: UserRole;
}
