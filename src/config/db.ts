import { MongoClient, type Db } from "mongodb";

let database: Db;
let mongoClient: MongoClient;

export const connectToDatabase = async (): Promise<void> => {
  const MONGODB_URI = process.env.MONGODB_URI;
  const DB_NAME = process.env.DB_NAME || "studiospace";

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in .env file");
  }

  const client = new MongoClient(MONGODB_URI);

  await client.connect();

  const db = client.db(DB_NAME);

  await db.command({ ping: 1 });

  mongoClient = client;
  database = db;

  console.log("MongoDB Connected Successfully!");
};

export const getDatabase = (): Db => {
  if (!database) {
    throw new Error("Database is not connected");
  }

  return database;
};

export const getMongoClient = (): MongoClient => {
  if (!mongoClient) {
    throw new Error("MongoDB client is not connected");
  }

  return mongoClient;
};