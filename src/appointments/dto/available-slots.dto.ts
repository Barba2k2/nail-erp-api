import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class AvailableSlotsDto {
  @IsDateString({}, { message: 'Data inválida' })
  date: string;

  @IsOptional()
  @IsInt({ message: 'O ID do serviço deve ser um número inteiro' })
  serviceId?: number;
}
