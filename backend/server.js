import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import cors from "cors";
import recordingsRouter from "./routes/recordings.js";
import { createRouteHandler } from "uploadthing/express";
import cookieParser from "cookie-parser";

import { uploadRouter } from "./uploadthing.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Enable CORS with credentials support
app.use(
  cors({
    origin: [
      process.env.FRONTEND_BASE_URL || "https://minute-intelligent-assistant.vercel.app",
      "https://minute-intelligent-assistant.onrender.com", // Allow direct backend access
      "http://localhost:5173", // Local development
      "http://localhost:8080"  // Local backend
    ],
    credentials: true, // Allow credentials (cookies, auth headers)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 200,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
    // config: { ... },
  })
);

const PORT = process.env.PORT || 3000;

app.all("/api/auth/*splat", async (req, res, next) => {
  console.log("Auth request:", {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    cookies: req.headers.cookie,
    userAgent: req.headers['user-agent'],
    headers: req.headers
  });

  // Try to get session if this is a get-session request
  if (req.url === '/get-session' || req.url === '/session') {
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });
      console.log("Manual session check result:", session ? "SUCCESS" : "NULL");
    } catch (error) {
      console.log("Manual session check error:", error.message);
    }
  }

  const handler = toNodeHandler(auth);
  return handler(req, res);
});

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());
app.use(cookieParser());

app.use("/recordings", recordingsRouter);

// Test endpoint to check cookie handling
app.get("/test-cookies", async (req, res) => {
  console.log("Test cookies endpoint:");
  console.log("Headers:", req.headers);
  console.log("Cookies:", req.headers.cookie);
  
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    console.log("Session result:", session ? "SUCCESS" : "NULL");
    res.json({ 
      cookiesReceived: !!req.headers.cookie,
      sessionFound: !!session,
      session: session?.user?.email || null
    });
  } catch (error) {
    console.log("Session error:", error.message);
    res.json({ 
      cookiesReceived: !!req.headers.cookie,
      sessionFound: false,
      error: error.message
    });
  }
});

app.get("/", (req, res) => {
  res.redirect(`${process.env.FRONTEND_BASE_URL || "http://localhost:5173"}/dashboard`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
