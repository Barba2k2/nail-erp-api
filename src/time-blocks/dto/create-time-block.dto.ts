import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateTimeBlockDto {
  @IsNotEmpty({ message: 'A data é obrigatória' })
  @IsDateString({}, { message: 'Formato de data inválido' })
  date: string;

  @IsNotEmpty({ message: 'O horário de início é obrigatório' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'O horário deve estar no formato HH:MM',
  })
  startTime: string;

  @IsNotEmpty({ message: 'O horário de fim é obrigatório' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'O horário deve estar no formato HH:MM',
  })
  endTime: string;

  @IsOptional()
  @IsString({ message: 'A razão deve ser um texto' })
  reason?: string;
}
