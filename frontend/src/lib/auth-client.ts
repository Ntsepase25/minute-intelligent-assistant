import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "https://minute-intelligent-assistant.onrender.com", // Always use Render backend directly
  fetchOptions: {
    credentials: "include", // Always include cookies
  },
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;
