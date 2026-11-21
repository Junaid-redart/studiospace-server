
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "node:dns";

import { toNodeHandler } from "better-auth/node";

import {
  connectToDatabase,
  getDatabase,
  getMongoClient,
} from "./config/db.js";

import { createAuth } from "./config/auth.js";
import studioRoutes from "./routes/studio.routes.js";
import createBookingRoutes from "./routes/booking.routes.js";
import createUploadRoutes from "./routes/upload.routes.js";

dotenv.config();

const app = express();
const apiApp = express();

const PORT = Number(process.env.PORT) || 5000;
const isVercel = Boolean(process.env.VERCEL);

// Preserve the existing local DNS workaround.
if (!isVercel) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

// Allow the local frontend and configured production frontend.
const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL?.replace(/\/$/, ""),
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Initialize MongoDB and API routes once per server instance.
let initializationPromise: Promise<void> | null = null;

function initializeBackend(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await connectToDatabase();

      const auth = createAuth(
        getDatabase(),
        getMongoClient()
      );

      // Better Auth routes
      apiApp.all("/api/auth/*splat", toNodeHandler(auth));

      // JSON middleware
      apiApp.use(express.json());

      // Studio routes
      apiApp.use("/api/studios", studioRoutes(auth));

      // Booking routes
      apiApp.use(
        "/api/bookings",
        createBookingRoutes(auth)
      );

      // Image upload routes
      apiApp.use(
        "/api/upload",
        createUploadRoutes(auth)
      );

      // Server health check
      apiApp.get("/", (_req, res) => {
        res.send("StudioSpace Server is Running!");
      });

      console.log("StudioSpace Backend initialized");
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

// Wait for initialization before processing requests.
app.use(async (req, res, next) => {
  try {
    await initializeBackend();
    apiApp(req, res, next);
  } catch (error) {
    console.error("Backend initialization failed:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Server initialization failed",
      });
    }
  }
});

// Local development only
if (!isVercel) {
  initializeBackend()
    .then(() => {
      app.listen(PORT, () => {
        console.log(
          `StudioSpace Server running on http://localhost:${PORT}`
        );
      });
    })
    .catch((error) => {
      console.error("Server startup failed:", error);
      process.exit(1);
    });
}

// Vercel uses this Express application.
export default app;
