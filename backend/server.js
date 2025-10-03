import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.ts";
import cors from "cors";
import recordingsRouter from "./routes/recordings.js";
import { createRouteHandler } from "uploadthing/express";

import { uploadRouter } from "./uploadthing.ts";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Enable CORS with credentials support
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend URL
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

app.all("/api/auth/{*any}", toNodeHandler(auth));

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

app.use("/recordings", recordingsRouter);

app.get("/", (req, res) => {
  res.redirect("http://localhost:5173/dashboard");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
