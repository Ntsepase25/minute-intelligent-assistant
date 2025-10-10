import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
  // In production, use the same domain (proxied through Vercel)
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // In development, use the backend URL directly
  return import.meta.env.VITE_BETTER_AUTH_URL || "http://localhost:8080";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
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
