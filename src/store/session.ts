export type Role = 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
export interface SessionUser { id: number; username: string; role: Role; token: string; }

const KEY = "gym.session";
export const session = {
  get(): SessionUser | null { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; },
  set(u: SessionUser) { localStorage.setItem(KEY, JSON.stringify(u)); },
  clear() { localStorage.removeItem(KEY); },
  isAuth() { return !!session.get()?.token; },
  hasRole(r: Role) { return session.get()?.role === r; }
};
