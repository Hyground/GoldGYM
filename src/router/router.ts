import { DashboardPage } from "../pages/Dashboard";
import { LoginPage } from "../pages/Login";
import { UsersPage } from "../pages/Users";
import { ClientsPage } from "../pages/Clients";
import { requireAuth, requireRole } from "./guards.ts";

type PageFn = () => Promise<string> | string;

// Mueve este archivo junto con guards.ts (más abajo)
const routes: Record<string, { page: PageFn; guard?: () => boolean }> = {
  "#/login":  { page: LoginPage },
  "#/":       { page: DashboardPage, guard: requireAuth },
  "#/users":  { page: UsersPage,     guard: () => requireAuth() && requireRole("ADMIN") },
  "#/clients":{ page: ClientsPage,   guard: requireAuth },
};

async function render() {
  const hash = (location.hash || "#/") as keyof typeof routes;
  const route = routes[hash] ?? routes["#/"];
  if (route.guard && !route.guard()) return;

  const html = await route.page();
  document.getElementById("app")!.innerHTML = html;
}

export function startRouter() {
  window.addEventListener("hashchange", render);
  render();
}
