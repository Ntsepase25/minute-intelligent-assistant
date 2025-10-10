import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PROD 
    ? window.location.origin // Use same domain in production (proxied)
    : "http://localhost:8080", // Direct backend in development
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
