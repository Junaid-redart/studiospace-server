
import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { ObjectId } from "mongodb";

import { getDatabase } from "../config/db.js";
import { createAuth } from "../config/auth.js";

type Auth = ReturnType<typeof createAuth>;

interface Review {
  studioId: ObjectId;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const createReviewRoutes = (auth: Auth) => {
  const router = Router();

  // GET reviews of a studio
  router.get("/studio/:studioId", async (req, res) => {
    try {
      const { studioId } = req.params;

      if (
        typeof studioId !== "string" ||
        !ObjectId.isValid(studioId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid studio ID",
        });
      }

      const db = getDatabase();
      const id = new ObjectId(studioId);

      const reviews = await db
        .collection<Review>("reviews")
        .find({ studioId: id })
        .sort({ updatedAt: -1 })
        .toArray();

      const totalReviews = reviews.length;

      const averageRating =
        totalReviews === 0
          ? 0
          : Number(
              (
                reviews.reduce(
                  (sum, review) => sum + review.rating,
                  0
                ) / totalReviews
              ).toFixed(1)
            );

      return res.status(200).json({
        success: true,
        data: reviews,
        averageRating,
        totalReviews,
      });
    } catch (error) {
      console.error("Get reviews error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve reviews",
      });
    }
  });

  // POST create or update review
  router.post("/studio/:studioId", async (req, res) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Please login to submit a review",
        });
      }

      const { studioId } = req.params;

      if (
        typeof studioId !== "string" ||
        !ObjectId.isValid(studioId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid studio ID",
        });
      }

      const { rating, comment } = req.body ?? {};

      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      if (
        typeof comment !== "string" ||
        comment.trim().length < 5 ||
        comment.trim().length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message: "Review must contain 5 to 1000 characters",
        });
      }

      const db = getDatabase();
      const id = new ObjectId(studioId);

      const studio = await db
        .collection("studios")
        .findOne({ _id: id });

      if (!studio) {
        return res.status(404).json({
          success: false,
          message: "Studio not found",
        });
      }

      if (studio.ownerId === session.user.id) {
        return res.status(403).json({
          success: false,
          message: "You cannot review your own studio",
        });
      }

      const reviewsCollection =
        db.collection<Review>("reviews");

      // Enforce one review per user per studio
      await reviewsCollection.createIndex(
        { studioId: 1, userId: 1 },
        { unique: true }
      );

      const now = new Date();

      await reviewsCollection.updateOne(
        {
          studioId: id,
          userId: session.user.id,
        },
        {
          $set: {
            userName: session.user.name,
            rating,
            comment: comment.trim(),
            updatedAt: now,
          },
          $setOnInsert: {
            studioId: id,
            userId: session.user.id,
            createdAt: now,
          },
        },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        message: "Review saved successfully",
      });
    } catch (error) {
      console.error("Save review error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save review",
      });
    }
  });

  return router;
};

export default createReviewRoutes;
