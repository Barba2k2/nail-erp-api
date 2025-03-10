import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { NotificationType, NotificationChannel } from '@prisma/client';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsNotEmpty()
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: Date;

  @IsOptional()
  @IsInt()
  appointmentId?: number;
}
