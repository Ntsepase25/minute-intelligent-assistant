import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import dotenv from "dotenv";

dotenv.config();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL:
    process.env.BETTER_AUTH_URL ||
    "https://minute-intelligent-assistant.onrender.com",
  basePath: "/api/auth",
  
  // Configure trusted origins FIRST
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
    cookie: {
      sameSite: "none", // Required for cross-site cookies
      secure: true, // Required when sameSite is "none"
      httpOnly: true,
      path: "/",
    },
  },

  // Configure for production
  advanced: {
    useSecureCookies: true,
  },
});
