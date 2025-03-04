import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class SpecialBusinessDayDto {
  @IsNotEmpty()
  @IsDateString({}, { message: 'Data inválida' })
  date: string;

  @IsNotEmpty()
  @IsBoolean()
  isOpen: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Horário deve estar no formato HH:MM',
  })
  openTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Horário deve estar no formato HH:MM',
  })
  closeTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
