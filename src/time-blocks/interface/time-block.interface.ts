export interface TimeBlock {
  id: number;
  date: Date;
  startTime: Date;
  endTime: Date;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}
