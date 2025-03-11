import { UserRole } from "@prisma/client";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from "class-validator";

export class RecoverPasswordDto { 
  @IsNotEmpty({ message: 'O email eh obrigatorio' })
  @IsEmail({}, { message: 'Email invalido' })
  email: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Tipo de usuario invalido' })
  userType: UserRole;
}