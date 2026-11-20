import { Router } from "express";
import { getDatabase } from "../config/db.js";

const router = Router();

// GET All Studios
router.get("/", async (req, res) => {
  try {
    const db = getDatabase();

    const studios = await db
      .collection("studios")
      .find({})
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

export default router;