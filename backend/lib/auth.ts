import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import dotenv from "dotenv";

dotenv.config();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL:
    process.env.BETTER_AUTH_URL ||
    "https://minute-intelligent-assistant.onrender.com",
  basePath: "/api/auth",
  
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:8080", 
    "https://minute-intelligent-assistant.onrender.com",
    process.env.FRONTEND_BASE_URL ||
      "https://minute-intelligent-assistant.vercel.app",
  ],
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      prompt: "select_account",
      accessType: "offline",
      scope: [
        "https://www.googleapis.com/auth/meetings.space.settings",
        "https://www.googleapis.com/auth/meetings.space.readonly",
      ],
      redirectURI: `${process.env.BETTER_AUTH_URL || "https://minute-intelligent-assistant.onrender.com"}/api/auth/callback/google`,
    },
  },
  
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },

  advanced: {
    useSecureCookies: true, // Set to false for local development over HTTP
    // Default attributes apply to ALL cookies
    defaultCookieAttributes: {
      sameSite: "none", // Required for cross-origin cookies
      secure: true,
      httpOnly: true,
      path: "/",
    },
  },
});
