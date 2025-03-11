export class AppointmentCreatedEvent {
  constructor(public readonly appointmentId: number) {}
}

export class AppointmentRescheduledEvent {
  constructor(public readonly appointmentId: number) {}
}

export class AppointmentCanceledEvent {
  constructor(public readonly appointmentId: number) {}
}

export class AppointmentStatusChangedEvent {
  constructor(
    public readonly appointmentId: number,
    public readonly status: string,
  ) {}
}
