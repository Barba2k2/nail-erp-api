import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateBusinessInfoDto {
  // Informações básicas
  @IsString({ message: 'O nome do negócio deve ser uma string' })
  @MinLength(3, { message: 'O nome deve ter pelo menos 3 caracteres' })
  @MaxLength(100, { message: 'O nome não deve exceder 100 caracteres' })
  name: string;

  @IsOptional()
  @IsString({ message: 'O slogan deve ser uma string' })
  @MaxLength(200, { message: 'O slogan não deve exceder 200 caracteres' })
  slogan?: string;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string' })
  @MaxLength(1000, { message: 'A descrição não deve exceder 1000 caracteres' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'O URL do logo deve ser uma string' })
  logo?: string;

  // Informações fiscais
  @IsOptional()
  @IsString({ message: 'O CNPJ deve ser uma string' })
  @MinLength(14, { message: 'O CNPJ deve ter pelo menos 14 caracteres' })
  cnpj?: string;

  @IsOptional()
  @IsString({ message: 'A inscrição estadual deve ser uma string' })
  stateRegistration?: string;

  @IsOptional()
  @IsString({ message: 'A inscrição municipal deve ser uma string' })
  cityRegistration?: string;

  // Informações de contato
  @IsEmail({}, { message: 'O email deve ser um endereço de email válido' })
  email: string;

  @IsString({ message: 'O telefone deve ser uma string' })
  @MinLength(8, { message: 'O telefone deve ter pelo menos 8 caracteres' })
  phone: string;

  @IsOptional()
  @IsString({ message: 'O WhatsApp deve ser uma string' })
  whatsapp?: string;

  // Endereço
  @IsString({ message: 'O endereço deve ser uma string' })
  address: string;

  @IsString({ message: 'A cidade deve ser uma string' })
  city: string;

  @IsString({ message: 'O estado deve ser uma string' })
  @MinLength(2, {
    message: 'A sigla do estado deve ter pelo menos 2 caracteres',
  })
  @MaxLength(2, { message: 'A sigla do estado não deve exceder 2 caracteres' })
  state: string;

  @IsString({ message: 'O CEP deve ser uma string' })
  @MinLength(8, { message: 'O CEP deve ter pelo menos 8 caracteres' })
  zipCode: string;

  @IsOptional()
  @IsString({ message: 'O bairro deve ser uma string' })
  neighborhood?: string;

  @IsOptional()
  @IsString({ message: 'O complemento deve ser uma string' })
  complement?: string;

  // Redes sociais
  @IsOptional()
  @IsString({ message: 'O Instagram deve ser uma string' })
  instagram?: string;

  @IsOptional()
  @IsString({ message: 'O Facebook deve ser uma string' })
  facebook?: string;

  @IsOptional()
  @IsString({ message: 'O TikTok deve ser uma string' })
  tiktok?: string;

  @IsOptional()
  @IsString({ message: 'O YouTube deve ser uma string' })
  youtube?: string;
}
