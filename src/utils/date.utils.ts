export class DateUtils {
  static extractDate(date: Date | null | undefined): string | null {
    if (!date) {
      return null;
    }

    try {
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }

  static extractTime(date: Date | null | undefined): string | null {
    if (!date) {
      return null;
    }

    try {
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toTimeString().substring(0, 5);
    } catch (error) {
      return null;
    }
  }

  static formatAppointmentDateTime(date: Date | null | undefined): {
    appointmentDate: string | null;
    appointmentTime: string | null;
  } {
    if (!date) {
      return {
        appointmentDate: null,
        appointmentTime: null,
      };
    }

    try {
      if (isNaN(date.getTime())) {
        return {
          appointmentDate: null,
          appointmentTime: null,
        };
      }

      return {
        appointmentDate: this.extractDate(date),
        appointmentTime: this.extractTime(date),
      };
    } catch (error) {
      return {
        appointmentDate: null,
        appointmentTime: null,
      };
    }
  }
}
