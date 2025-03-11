import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'O token e obrigatorio' })
  @IsString({ message: 'Token invalido' })
  token: string;

  @IsNotEmpty({ message: 'A nova senha e obrigatoria' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/, {
    message:
      'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
  })
  newPassword: string;

  @IsNotEmpty({ message: 'A confirmação de senha é obrigatória' })
  @IsString({ message: 'Confirmação de senha inválida' })
  confirmPassword: string;
}
