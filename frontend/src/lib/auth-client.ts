import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || "http://localhost:8080",
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;
