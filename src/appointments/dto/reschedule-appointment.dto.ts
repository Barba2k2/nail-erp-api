import { IsEnum, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class RescheduleAppointmentDto {
  @IsNotEmpty({ message: 'A data é obrigatória' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Formato de data inválido. Use YYYY-MM-DD',
  })
  appointmentDate: string; // Formato: YYYY-MM-DD

  @IsNotEmpty({ message: 'O horário é obrigatório' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Formato de horário inválido. Use HH:MM (24h)',
  })
  appointmentTime: string; // Formato: HH:MM

  @IsOptional()
  @IsEnum(AppointmentStatus, { message: 'Status inválido' })
  status?: AppointmentStatus;
}
