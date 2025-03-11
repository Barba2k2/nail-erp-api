import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationSchedulerService } from '../notification-scheduler.service';
import {
  AppointmentCanceledEvent,
  AppointmentCreatedEvent,
  AppointmentRescheduledEvent,
  AppointmentStatusChangedEvent,
} from 'src/appointments/events/appointment.events';

@Injectable()
export class AppointmentNotificationListener {
  private readonly logger = new Logger(AppointmentNotificationListener.name);

  constructor(
    private readonly notificationSheduler: NotificationSchedulerService,
  ) {}

  @OnEvent('appointment.created')
  async handleAppointmentCreatedEvent(event: AppointmentCreatedEvent) {
    this.logger.log(
      `Appoinment created event received: ${event.appointmentId}`,
    );
    await this.notificationSheduler.createAppointmentConfirmation(
      event.appointmentId,
    );
  }

  @OnEvent('appointment.rescheduled')
  async handleAppointmentRescheduledEvent(event: AppointmentRescheduledEvent) {
    this.logger.log(
      `Appoinment rescheduled event received: ${event.appointmentId}`,
    );
    await this.notificationSheduler.createRescheduleNotification(
      event.appointmentId,
    );
  }

  @OnEvent('appointment.canceled')
  async handleAppointmentCanceledEvent(event: AppointmentCanceledEvent) {
    this.logger.log(
      `Appoinment canceled event received: ${event.appointmentId}`,
    );
    await this.notificationSheduler.createCancellationNotification(
      event.appointmentId,
    );
  }

  @OnEvent('appointment.status.changed')
  async handleAppointmentStatusChangedEvent(
    event: AppointmentStatusChangedEvent,
  ) {
    this.logger.log(
      `Appoinment status changed event received: ${event.appointmentId}`,
    );

    if (event.status == 'CANCELED') {
      await this.notificationSheduler.createCancellationNotification(
        event.appointmentId,
      );
    } else if (event.status == 'RESCHEDULED') {
      await this.notificationSheduler.createRescheduleNotification(
        event.appointmentId,
      );
    } else if (event.status == 'CONFIRMED') {
      await this.notificationSheduler.createAppointmentConfirmation(
        event.appointmentId,
      );
    }
  }
}
