import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
   baseURL: `${import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8080"}/api/auth`, // Your backend URL with auth path
  fetchOptions: {
    credentials: "include", // Ensure cookies are sent
  },
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;
