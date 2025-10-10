import { createAuthClient } from "better-auth/react";

// Always use same domain in production (proxied through Vercel)
const getBaseURL = () => {
  // In production (deployed on Vercel), use the same domain
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    console.log('Using proxy baseURL:', window.location.origin);
    return window.location.origin;
  }
  // In development, use direct backend URL
  console.log('Using development baseURL: http://localhost:8080');
  return "http://localhost:8080";
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
