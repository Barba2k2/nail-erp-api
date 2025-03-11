import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class CreateClientDto {
  @IsNotEmpty({ message: 'O nome e obrigatorio' })
  @IsString({ message: 'O nome deve ser uma string' })
  name: string;

  @IsNotEmpty({ message: 'O email e obrigatorio' })
  @IsEmail({}, { message: 'E-mail invalido' })
  email: string;

  @IsNotEmpty({ message: 'A senha e obrigatoria' })
  @MinLength(6, { message: 'A senha deve ter no minimo 6 caracteres' })
  password: string;

  @IsOptional()
  @IsString({ message: 'O telefone deve ser uma string' })
  phone?: string;

  @IsOptional()
  preferences?: Record<string, any>;
}