import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyTokenDto {
  @IsNotEmpty({ message: 'O token é obrigatório' })
  @IsString({ message: 'Token invalido' })
  token: string;
}
