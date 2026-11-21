
import type { ObjectId } from "mongodb";

export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

export interface Booking {
  _id?: ObjectId;

  studioId: ObjectId;
  studioTitle: string;

  userId: string;
  userName: string;
  userEmail: string;

  bookingDate: string;
  startTime: string;
  endTime: string;

  totalHours: number;
  hourlyRate: number;
  studioRent: number;
  securityDeposit: number;
  totalAmount: number;

  status: BookingStatus;

  createdAt: Date;
  updatedAt: Date;
}
