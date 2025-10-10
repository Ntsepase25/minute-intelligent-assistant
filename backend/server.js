import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import cors from "cors";
import recordingsRouter from "./routes/recordings.js";
import { createRouteHandler } from "uploadthing/express";

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

app.use("/api/auth/*splat", (req, res, next) => {
  console.log("Auth request:", {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    cookies: req.headers.cookie,
    userAgent: req.headers['user-agent']
  });
  next();
}, toNodeHandler(auth));

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

app.use("/recordings", recordingsRouter);

app.get("/", (req, res) => {
  res.redirect(`${process.env.FRONTEND_BASE_URL || "http://localhost:5173"}/dashboard`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
