import { createAuthClient } from "better-auth/react";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const AUTH_BASE_URL = import.meta.env.PROD ? window.location.origin : API_URL;

if (!AUTH_BASE_URL) {
  throw new Error("VITE_API_URL no está configurada. Añádela a .env.local.");
}

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  fetchOptions: {
    credentials: "include",
  },
});
