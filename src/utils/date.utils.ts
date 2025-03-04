export class DateUtils {
  static extractDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  static extractTime(date: Date): string {
    return date.toTimeString().substring(0, 5);
  }

  static formatAppointmentDateTime(date: Date): {
    appointmentDate: string;
    appointmentTime: string;
  } {
    return {
      appointmentDate: this.extractDate(date),
      appointmentTime: this.extractTime(date),
    };
  }
}
