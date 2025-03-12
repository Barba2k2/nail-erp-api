import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum MessageTemplateType {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  BOTH = 'BOTH',
}

export enum MessageTemplatePurpose {
  MARKETING = 'MARKETING',
  BIRTHDAY = 'BIRTHDAY',
  LOYALTY = 'LOYALTY',
  ABANDONED_CART = 'ABANDONED_CART',
  WELCOME = 'WELCOME',
  PASSWORD_RECOVERY = 'PASSWORD_RECOVERY',
  CUSTOM = 'CUSTOM',
}

export class CreateMessageTemplateDto {
  @IsNotEmpty({ message: 'Nome do template é obrigatório' })
  @IsString({ message: 'Nome do template deve ser texto.' })
  @MinLength(3, { message: 'Nome do template deve ter no minimo 3 caracteres' })
  @MaxLength(100, {
    message: 'Nome do template nao deve ser exceder 100 caracteres',
  })
  name: string;

  @IsNotEmpty({ message: 'O assunto e obrigatorio' })
  @IsString({ message: 'O assunto deve ser texto' })
  @MinLength(3, { message: 'O assunto deve ter no minimo 3 caracteres' })
  @MaxLength(200, {
    message: 'O assunto nao deve ser exceder 200 caracteres',
  })
  subject: string;

  @IsNotEmpty({ message: 'O conteudo e obrigatorio' })
  @IsString({ message: 'O conteudo deve ser texto' })
  content: string;

  @IsEnum(MessageTemplateType, {
    message: 'Tipo invalido. Use EMAIL, WHATSAPP ou BOTH',
  })
  type: MessageTemplateType;

  @IsEnum(MessageTemplatePurpose, {
    message:
      'Propósito invalido. Use MARKETING, BIRTHDAY, LOYALTY, ABANDONED_CART, WELCOME, PASSWORD_RECOVERY ou CUSTOM',
  })
  purpose: MessageTemplatePurpose;

  @IsOptional()
  @IsBoolean({ message: 'isDefault deve ser um booleano' })
  isDefault?: boolean;

  @IsOptional()
  @IsString({ message: 'Descricao deve ser texto' })
  @MaxLength(500, { message: 'Descricao nao deve exceder 500 caracteres' })
  description?: string;
}
