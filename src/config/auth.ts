
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import type { Db, MongoClient } from "mongodb";

export const createAuth = (db: Db, client: MongoClient) => {
  const isProduction = process.env.NODE_ENV === "production";

  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");

  const trustedOrigins = [
    ...(isProduction ? [] : ["http://localhost:3000"]),
    ...(frontendUrl ? [frontendUrl] : []),
  ];

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

    // Local: http://localhost:5000
    // Production: https://your-backend.vercel.app
    baseURL: process.env.BETTER_AUTH_URL,

    secret: process.env.BETTER_AUTH_SECRET,

    trustedOrigins,

    // Production requires secure cookies.
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
      },
    },

    // JWT-formatted HTTPOnly session cache
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
        strategy: "jwt",
      },
    },
  });
};
