import { api } from "./api";
import { session, type SessionUser } from "../store/session";

export async function login(username: string, password: string) {
  // Ajusta al endpoint real de tu backend
  const user = await api.post<SessionUser>("/auth/login", { username, password });
  session.set(user);
  return user;
}
export function logout() { session.clear(); location.hash = "#/login"; }
