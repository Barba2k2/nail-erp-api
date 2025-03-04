import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateBusinessHoursDto {
  @IsNotEmpty()
  @IsIn([0, 1, 2, 3, 4, 5, 6], {
    message: 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)',
  })
  dayOfWeek: number;

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
}
