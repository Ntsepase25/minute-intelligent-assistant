import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import dotenv from "dotenv";

dotenv.config();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      prompt: "select_account",
      accessType: "offline",
      scope: [
        "https://www.googleapis.com/auth/meetings.space.settings",
        "https://www.googleapis.com/auth/meetings.space.readonly"
      ],
    },
  },
  trustedOrigins: ["http://localhost:5173", "http://localhost:8080", "https://minute-intelligent-assistant.onrender.com", process.env.FRONTEND_BASE_URL || "https://minute-intelligent-assistant.vercel.app/"], // Add your frontend URL here
});
