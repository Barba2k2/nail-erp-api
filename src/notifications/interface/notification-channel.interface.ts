import { NotificationChannel } from "@prisma/client";

export interface NotificationChannelStrategy { 
  send(to: string, subject: string, content: string): Promise<boolean>;
  validateDestination(destination: string): boolean;
  getChannel(): NotificationChannel;
}