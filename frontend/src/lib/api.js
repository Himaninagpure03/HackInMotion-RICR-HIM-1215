import { useAuth } from "@clerk/clerk-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Returns a `fetch`-like function that automatically attaches the
 * current user's Clerk session token. Use this for every call to
 * the FastAPI backend.
 *
 * const api = useApi();
 * const res = await api("/me");
 */
export function useApi() {
  const { getToken } = useAuth();

  return async function api(path, options = {}) {
    const token = await getToken();

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${res.status}: ${body}`);
    }

    return res.status === 204 ? null : res.json();
  };
}
