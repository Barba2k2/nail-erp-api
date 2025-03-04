import { DateUtils } from "src/utils/date.utils";


describe('DateUtils', () => {
  describe('extractDate', () => {
    it('should extract date in YYYY-MM-DD format from a Date object', () => {
      const date = new Date('2025-03-10T10:00:00');
      const result = DateUtils.extractDate(date);
      expect(result).toBe('2025-03-10');
    });

    it('should return null for null or undefined date', () => {
      expect(DateUtils.extractDate(null)).toBeNull();
      expect(DateUtils.extractDate(undefined)).toBeNull();
    });

    it('should return null for invalid date', () => {
      const invalidDate = new Date('invalid');
      expect(DateUtils.extractDate(invalidDate)).toBeNull();
    });
  });

  describe('extractTime', () => {
    it('should extract time in HH:MM format from a Date object', () => {
      const date = new Date('2025-03-10T10:30:00');
      const result = DateUtils.extractTime(date);
      expect(result).toBe('10:30');
    });

    it('should return null for null or undefined date', () => {
      expect(DateUtils.extractTime(null)).toBeNull();
      expect(DateUtils.extractTime(undefined)).toBeNull();
    });

    it('should return null for invalid date', () => {
      const invalidDate = new Date('invalid');
      expect(DateUtils.extractTime(invalidDate)).toBeNull();
    });
  });

  describe('formatAppointmentDateTime', () => {
    it('should format a Date object into separate date and time fields', () => {
      const date = new Date('2025-03-10T14:30:00');
      const result = DateUtils.formatAppointmentDateTime(date);
      expect(result).toEqual({
        appointmentDate: '2025-03-10',
        appointmentTime: '14:30',
      });
    });

    it('should return null values for null date', () => {
      const result = DateUtils.formatAppointmentDateTime(null);
      expect(result).toEqual({
        appointmentDate: null,
        appointmentTime: null,
      });
    });

    it('should return null values for invalid date', () => {
      const invalidDate = new Date('invalid');
      const result = DateUtils.formatAppointmentDateTime(invalidDate);
      expect(result).toEqual({
        appointmentDate: null,
        appointmentTime: null,
      });
    });
  });
});
