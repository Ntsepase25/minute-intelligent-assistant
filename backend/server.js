import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.ts";

const app = express();

const PORT = process.env.PORT || 3000;

app.all("/api/auth/{*any}", toNodeHandler(auth));

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

app.get("/", (req, res) => {
  res.redirect("http://localhost:5173/dashboard");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
