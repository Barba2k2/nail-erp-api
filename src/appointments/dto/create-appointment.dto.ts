import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class CreateAppointmentDto {
  @IsNotEmpty({ message: 'A data é obrigatória' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Formato de data inválido. Use YYYY-MM-DD',
  })
  appointmentDate: string;

  @IsNotEmpty({ message: 'O horário é obrigatório' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Formato de horário inválido. Use HH:MM (24h)',
  })
  appointmentTime: string;

  @IsOptional()
  @IsEnum(AppointmentStatus, { message: 'Status inválido' })
  status?: AppointmentStatus;

  @IsOptional()
  @IsString({ message: 'As notas devem ser texto' })
  notes?: string;

  @IsNotEmpty({ message: 'O ID do serviço é obrigatório' })
  @IsInt({ message: 'O ID do serviço deve ser um número inteiro' })
  serviceId: number;
}
