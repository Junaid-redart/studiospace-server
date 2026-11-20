import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "node:dns";
import studioRoutes from "./routes/studio.routes.js";

import { connectToDatabase } from "./config/db.js";

dotenv.config();

// DNS Configuration
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
// Routes
app.use("/api/studios", studioRoutes);
// Test API
app.get("/", (req, res) => {
  res.send("StudioSpace Server is Running!");
});

// Start Server
const startServer = async () => {
  try {
    await connectToDatabase();

    app.listen(PORT, () => {
      console.log(`StudioSpace Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
