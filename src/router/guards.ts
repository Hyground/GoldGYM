import { session } from "../store/session";
import type { Role } from "../store/session";

export function requireAuth(): boolean {
  if (!session.isAuth()) { location.hash = "#/login"; return false; }
  return true;
}
export function requireRole(role: Role): boolean {
  if (!session.isAuth() || !session.hasRole(role)) { location.hash = "#/"; return false; }
  return true;
}
