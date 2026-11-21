import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "node:dns";
import createBookingRoutes from "./routes/booking.routes.js";
import createUploadRoutes from "./routes/upload.routes.js";

import { toNodeHandler } from "better-auth/node";

import {
  connectToDatabase,
  getDatabase,
  getMongoClient,
} from "./config/db.js";

import { createAuth } from "./config/auth.js";
import studioRoutes from "./routes/studio.routes.js";

dotenv.config();

// DNS Configuration
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

const PORT = process.env.PORT || 5000;

// CORS Configuration
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Start Server
const startServer = async () => {
  try {
    // Connect MongoDB
    await connectToDatabase();

    // Initialize Better Auth
    const auth = createAuth(getDatabase(), getMongoClient());



    app.all("/api/auth/*splat", toNodeHandler(auth));

    // JSON Middleware
    app.use(express.json());

    // Studio Routes
    app.use("/api/studios", studioRoutes(auth));
    // Booking Routes
    app.use("/api/bookings", createBookingRoutes(auth));

    // Image Upload Routes
    app.use("/api/upload", createUploadRoutes(auth));

    // Test API
    app.get("/", (req, res) => {
      res.send("StudioSpace Server is Running!");
    });

    // Start Express Server
    app.listen(PORT, () => {
      console.log(`StudioSpace Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();