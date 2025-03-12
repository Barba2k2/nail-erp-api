import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  MessageTemplateType,
  MessageTemplatePurpose,
} from './create-message-template.dto';

export class QueryMessageTemplateDto {
  @IsOptional()
  @IsEnum(MessageTemplateType, {
    message: 'Tipo inválido. Use: EMAIL, WHATSAPP ou BOTH',
  })
  type?: MessageTemplateType;

  @IsOptional()
  @IsEnum(MessageTemplatePurpose, { message: 'Propósito inválido' })
  purpose?: MessageTemplatePurpose;

  @IsOptional()
  @IsString({ message: 'Termo de busca deve ser texto' })
  search?: string;
}
