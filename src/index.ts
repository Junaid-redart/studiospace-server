import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dns from "node:dns";

dotenv.config();
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "studiospace";

// Middleware
app.use(cors());
app.use(express.json());

// Test API
app.get("/", (req, res) => {
  res.send("StudioSpace Server is Running!");
});

// MongoDB Connection
const startServer = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env file");
    }

    const client = new MongoClient(MONGODB_URI);

    await client.connect();

    const db = client.db(DB_NAME);

    await db.command({ ping: 1 });

    console.log("MongoDB Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`StudioSpace Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();