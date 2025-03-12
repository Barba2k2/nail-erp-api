import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MessageTemplateType,
  MessageTemplatePurpose,
} from './create-message-template.dto';

export class UpdateMessageTemplateDto {
  @IsOptional()
  @IsString({ message: 'Nome do template deve ser texto' })
  @MinLength(3, {
    message: 'Nome do template deve ter pelo menos 3 caracteres',
  })
  @MaxLength(100, {
    message: 'Nome do template não deve exceder 100 caracteres',
  })
  name?: string;

  @IsOptional()
  @IsString({ message: 'O assunto é obrigatório' })
  @MaxLength(200, { message: 'Assunto não deve exceder 200 caracteres' })
  subject?: string;

  @IsOptional()
  @IsString({ message: 'Conteúdo deve ser texto' })
  content?: string;

  @IsOptional()
  @IsEnum(MessageTemplateType, {
    message: 'Tipo inválido. Use: EMAIL, WHATSAPP ou BOTH',
  })
  type?: MessageTemplateType;

  @IsOptional()
  @IsEnum(MessageTemplatePurpose, { message: 'Propósito inválido' })
  purpose?: MessageTemplatePurpose;

  @IsOptional()
  @IsBoolean({ message: 'isDefault deve ser um booleano' })
  isDefault?: boolean;

  @IsOptional()
  @IsString({ message: 'Descrição deve ser texto' })
  @MaxLength(500, { message: 'Descrição não deve exceder 500 caracteres' })
  description?: string;
}
