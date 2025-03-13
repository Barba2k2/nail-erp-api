import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyTokenDto {
  @IsNotEmpty({ message: 'O token é obrigatório' })
  @IsString({ message: 'Token inválido' })
  token: string;
}
