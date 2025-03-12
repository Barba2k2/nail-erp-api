import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TestMessageTemplateDto {
  @IsNotEmpty({ message: 'ID do template é obrigatório' })
  @IsString({ message: 'ID do template deve ser texto' })
  templateId: string;

  @IsNotEmpty({ message: 'Email para teste é obrigatório' })
  @IsEmail({}, { message: 'Email para teste deve ser válido' })
  testEmail: string;

  @IsOptional()
  @IsString({ message: 'Número de WhatsApp deve ser texto' })
  testWhatsapp?: string;

  @IsOptional()
  testData?: Record<string, any>;
}
