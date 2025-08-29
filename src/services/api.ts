import { session } from "../store/session";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "0") === "1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (USE_MOCK) throw new Error("MOCK_MODE");
  const token = session.get()?.token;
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.status === 204 ? (undefined as T) : await res.json();
}

export const api = {
  get:  <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: "POST", body: JSON.stringify(body) }),
  put:  <T>(p: string, body?: unknown) => request<T>(p, { method: "PUT",  body: JSON.stringify(body) }),
  del:  <T>(p: string) => request<T>(p, { method: "DELETE" }),
};
