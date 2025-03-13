import {
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'O token é obrigatório' })
  @IsString({ message: 'Token inválido' })
  token: string;

  @IsNotEmpty({ message: 'A nova senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
  })
  @Transform(({ value, obj }) => {
    return value || obj.password;
  })
  newPassword: string;

  @IsNotEmpty({ message: 'A confirmação de senha é obrigatória' })
  @IsString({ message: 'Confirmação de senha inválida' })
  confirmPassword: string;

  @IsOptional()
  password?: string;
}
