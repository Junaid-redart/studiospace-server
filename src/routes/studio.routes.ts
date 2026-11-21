import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";
import { createAuth } from "../config/auth.js";
import { validateStudio } from "../utils/validateStudio.js";

import type { Studio } from "../types/studio.js";

const createStudioRoutes = (auth: ReturnType<typeof createAuth>) => {
  const router = Router();

  // GET All Studios
  router.get("/", async (req, res) => {
    try {
      const db = getDatabase();


      const studios = await db
        .collection<Studio>("studios")
        .aggregate([
          {
            $lookup: {
              from: "reviews",
              localField: "_id",
              foreignField: "studioId",
              as: "studioReviews",
            },
          },
          {
            $addFields: {
              totalReviews: { $size: "$studioReviews" },
              averageRating: {
                $cond: [
                  { $gt: [{ $size: "$studioReviews" }, 0] },
                  { $round: [{ $avg: "$studioReviews.rating" }, 1] },
                  0,
                ],
              },
            },
          },
          {
            $project: {
              studioReviews: 0,
            },
          },
        ])
        .toArray();


      res.status(200).json({
        success: true,
        message: "Studios retrieved successfully",
        data: studios,
      });
    } catch (error) {
      console.error("Error fetching studios:", error);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve studios",
      });
    }
  });

  // POST Create Studio
  router.post("/", async (req, res) => {
    try {
      // Step 1: Verify authenticated user
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please login first.",
        });
      }

      // Step 2: Validate request data
      const errors = validateStudio(req.body);

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Studio validation failed",
          errors,
        });
      }

      // Step 3: Prepare studio data
      const {
        title,
        category,
        hourlyRate,
        securityDeposit,
        maxCapacity,
        location,
        imageUrl,
        images,
        amenities,
        overview,
      } = req.body;

      const now = new Date();

      const newStudio: Studio = {
        title: title.trim(),
        category: category.trim(),

        hourlyRate,
        securityDeposit,
        maxCapacity,

        location: location.trim(),
        imageUrl: imageUrl.trim(),
        images: images?.map((url: string) => url.trim()) ?? [imageUrl.trim()],

        amenities: amenities.map((amenity: string) =>
          amenity.trim()
        ),

        overview: overview.trim(),

        // Owner information from verified session
        ownerId: session.user.id,
        ownerName: session.user.name,
        ownerEmail: session.user.email,

        createdAt: now,
        updatedAt: now,
      };

      // Step 4: Save to MongoDB
      const db = getDatabase();

      const result = await db
        .collection<Studio>("studios")
        .insertOne(newStudio);

      // Step 5: Success response
      return res.status(201).json({
        success: true,
        message: "Studio created successfully",
        data: {
          _id: result.insertedId,
          ...newStudio,
        },
      });
    } catch (error) {
      console.error("Error creating studio:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create studio",
      });
    }
  });

  // GET Featured Studios (latest 6)
  router.get("/featured", async (req, res) => {
    try {
      const db = getDatabase();


      const studios = await db
        .collection<Studio>("studios")
        .aggregate([
          { $sort: { createdAt: -1 } },
          { $limit: 6 },
          {
            $lookup: {
              from: "reviews",
              localField: "_id",
              foreignField: "studioId",
              as: "studioReviews",
            },
          },
          {
            $addFields: {
              totalReviews: { $size: "$studioReviews" },
              averageRating: {
                $cond: [
                  { $gt: [{ $size: "$studioReviews" }, 0] },
                  { $round: [{ $avg: "$studioReviews.rating" }, 1] },
                  0,
                ],
              },
            },
          },
          {
            $project: {
              studioReviews: 0,
            },
          },
        ])
        .toArray();


      return res.status(200).json({
        success: true,
        message: "Featured studios retrieved successfully.",
        data: studios,
      });
    } catch (error) {
      console.error("Get Featured Studios Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve featured studios.",
      });
    }
  });

  // GET My Studio Listings
  router.get("/my-listings", async (req, res) => {
    try {
      // Verify authenticated user
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please login first.",
        });
      }

      const db = getDatabase();

      // Only studios created by the logged-in user
      const studios = await db
        .collection<Studio>("studios")
        .find({
          ownerId: session.user.id,
        })
        .sort({
          createdAt: -1,
        })
        .toArray();

      return res.status(200).json({
        success: true,
        message: "My studio listings retrieved successfully",
        data: studios,
      });
    } catch (error) {
      console.error("Error fetching my studios:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve your studios",
      });
    }
  });

  // GET Single Studio
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Step 1: Validate Studio ID
      if (
        typeof id !== "string" ||
        !ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid Studio ID",
        });
      }

      // Step 2: Find studio by ID
      const db = getDatabase();

      const studio = await db
        .collection<Studio>("studios")
        .findOne({
          _id: new ObjectId(id),
        });

      // Step 3: Check whether studio exists
      if (!studio) {
        return res.status(404).json({
          success: false,
          message: "Studio not found",
        });
      }

      // Step 4: Success response
      return res.status(200).json({
        success: true,
        message: "Studio retrieved successfully",
        data: studio,
      });
    } catch (error) {
      console.error("Error fetching studio:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve studio",
      });
    }
  });
  // PATCH Update Studio
  router.patch("/:id", async (req, res) => {
    try {
      // Step 1: Verify logged-in user
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please login first.",
        });
      }

      // Step 2: Validate Studio ID
      const { id } = req.params;

      if (
        typeof id !== "string" ||
        !ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid Studio ID",
        });
      }

      // Step 3: Validate updated studio data
      const errors = validateStudio(req.body);

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Studio validation failed",
          errors,
        });
      }

      // Step 4: Extract editable fields
      const {
        title,
        category,
        hourlyRate,
        securityDeposit,
        maxCapacity,
        location,
        imageUrl,
        images,
        amenities,
        overview,
      } = req.body;

      const updatedData = {
        title: title.trim(),
        category: category.trim(),

        hourlyRate,
        securityDeposit,
        maxCapacity,

        location: location.trim(),
        imageUrl: imageUrl.trim(),
        ...(images !== undefined && {
          images: images.map((url: string) => url.trim()),
        }),

        amenities: amenities.map((amenity: string) =>
          amenity.trim()
        ),

        overview: overview.trim(),

        updatedAt: new Date(),
      };

      // Step 5: Update only the logged-in user's studio
      const db = getDatabase();

      const result = await db
        .collection<Studio>("studios")
        .updateOne(
          {
            _id: new ObjectId(id),
            ownerId: session.user.id,
          },
          {
            $set: updatedData,
          }
        );

      // Step 6: Check whether studio belongs to this user
      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Studio not found or access denied",
        });
      }

      // Step 7: Success response
      return res.status(200).json({
        success: true,
        message: "Studio updated successfully",
      });
    } catch (error) {
      console.error("Error updating studio:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update studio",
      });
    }
  });

  // DELETE Studio
  router.delete("/:id", async (req, res) => {
    try {
      // Step 1: Verify logged-in user
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please login first.",
        });
      }

      // Step 2: Validate Studio ID
      const { id } = req.params;

      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Studio ID",
        });
      }

      // Step 3: Access MongoDB
      const db = getDatabase();

      // Step 4: Delete only the owner's studio
      const result = await db
        .collection<Studio>("studios")
        .deleteOne({
          _id: new ObjectId(id),
          ownerId: session.user.id,
        });

      // Step 5: Check if studio was deleted
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Studio not found or access denied",
        });
      }

      // Step 6: Success response
      return res.status(200).json({
        success: true,
        message: "Studio deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting studio:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete studio",
      });
    }
  });

  return router;
};

export default createStudioRoutes;