
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import type { Db, MongoClient } from "mongodb";

export const createAuth = (db: Db, client: MongoClient) => {
  return betterAuth({
    database: mongodbAdapter(db, {
      client,
    }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      autoSignIn: false,
    },

    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },

    baseURL: process.env.BETTER_AUTH_URL,

    secret: process.env.BETTER_AUTH_SECRET,

    trustedOrigins: [
      "http://localhost:3000",
    ],

    // JWT-formatted session cache stored in an HTTPOnly cookie
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
        strategy: "jwt",
      },
    },
  });
};
