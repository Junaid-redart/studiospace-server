
import { Router } from "express";
import { ObjectId } from "mongodb";
import { fromNodeHeaders } from "better-auth/node";

import { getDatabase } from "../config/db.js";
import { createAuth } from "../config/auth.js";

import type { Studio } from "../types/studio.js";
import type { Booking } from "../types/booking.js";

const createBookingRoutes = (
  auth: ReturnType<typeof createAuth>
) => {
  const router = Router();

  // POST /api/bookings
  router.post("/", async (req, res) => {
    try {
      // 1. Authentication
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Please login to book a studio.",
        });
      }

      // 2. Read booking information
      const { studioId, bookingDate, startTime, endTime } =
        req.body ?? {};

      if (
        typeof studioId !== "string" ||
        !ObjectId.isValid(studioId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid Studio ID",
        });
      }

      // 3. Validate date
      if (
        typeof bookingDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)
      ) {
        return res.status(400).json({
          success: false,
          message: "Booking date must be YYYY-MM-DD.",
        });
      }

      const parsedDate = new Date(
        `${bookingDate}T00:00:00.000Z`
      );

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== bookingDate
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking date.",
        });
      }

      // 4. Validate time
      const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

      if (
        typeof startTime !== "string" ||
        typeof endTime !== "string" ||
        !timePattern.test(startTime) ||
        !timePattern.test(endTime)
      ) {
        return res.status(400).json({
          success: false,
          message: "Time must be in HH:mm format.",
        });
      }

      // Convert HH:mm to minutes
      const toMinutes = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const startMinutes = toMinutes(startTime);
      const endMinutes = toMinutes(endTime);

      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          success: false,
          message: "End time must be after start time.",
        });
      }

      const db = getDatabase();

      // 5. Find studio
      const studio = await db
        .collection<Studio>("studios")
        .findOne({
          _id: new ObjectId(studioId),
        });

      if (!studio) {
        return res.status(404).json({
          success: false,
          message: "Studio not found.",
        });
      }

      // 6. Prevent booking your own studio
      if (studio.ownerId === session.user.id) {
        return res.status(403).json({
          success: false,
          message: "You cannot book your own studio.",
        });
      }

      // 7. Check confirmed booking overlap
      const conflictingBooking = await db
        .collection<Booking>("bookings")
        .findOne({
          studioId: studio._id,
          bookingDate,
          status: "Confirmed",
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        });

      if (conflictingBooking) {
        return res.status(409).json({
          success: false,
          message:
            "This studio is already booked for the selected time.",
        });
      }

      // 8. Calculate pricing on server
      const totalHours =
        (endMinutes - startMinutes) / 60;

      const hourlyRate = studio.hourlyRate;

      const studioRent = Number(
        (totalHours * hourlyRate).toFixed(2)
      );

      const securityDeposit = studio.securityDeposit;

      const totalAmount = Number(
        (studioRent + securityDeposit).toFixed(2)
      );

      // 9. Prepare booking document
      const newBooking: Booking = {
        studioId: studio._id!,
        studioTitle: studio.title,

        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,

        bookingDate,
        startTime,
        endTime,

        totalHours,
        hourlyRate,
        studioRent,
        securityDeposit,
        totalAmount,

        status: "Pending",

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 10. Save booking
      const result = await db
        .collection<Booking>("bookings")
        .insertOne(newBooking);

      return res.status(201).json({
        success: true,
        message: "Booking created successfully.",
        data: {
          ...newBooking,
          _id: result.insertedId,
        },
      });
    } catch (error) {
      console.error("Create Booking Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create booking.",
      });
    }
  });

  // GET /api/bookings/my-bookings
  router.get("/my-bookings", async (req, res) => {
    try {
      // Step 1: Check logged-in user
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Please login to view your bookings.",
        });
      }

      // Step 2: Find bookings belonging to this user
      const db = getDatabase();

      const bookings = await db
        .collection<Booking>("bookings")
        .find({
          userId: session.user.id,
        })
        .sort({
          createdAt: -1,
        })
        .toArray();

      // Step 3: Return booking data
      return res.status(200).json({
        success: true,
        message: "My bookings retrieved successfully.",
        data: bookings,
      });
    } catch (error) {
      console.error("Get My Bookings Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve bookings.",
      });
    }
  });


  // PATCH /api/bookings/:id/cancel
  router.patch("/:id/cancel", async (req, res) => {
    try {
      // Check authentication
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Please login to cancel your booking.",
        });
      }

      // Validate Booking ID
      const { id } = req.params;

      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Booking ID.",
        });
      }

      const db = getDatabase();

      // Cancel only this user's Pending booking
      const result = await db
        .collection<Booking>("bookings")
        .updateOne(
          {
            _id: new ObjectId(id),
            userId: session.user.id,
            status: "Pending",
          },
          {
            $set: {
              status: "Cancelled",
              updatedAt: new Date(),
            },
          }
        );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Pending booking not found or cancellation not allowed.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Booking cancelled successfully.",
      });
    } catch (error) {
      console.error("Cancel Booking Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to cancel booking.",
      });
    }
  });


  return router;
};

export default createBookingRoutes;
