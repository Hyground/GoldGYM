import { DashboardLayout } from "../layouts/DashboardLayout";
import { api } from "../services/api";

type UserDTO = { id: number; username: string; role: string };

export async function UsersPage() {
  let users: UserDTO[] = [];
  try {
    users = await api.get<UserDTO[]>("/users");
  } catch {
    users = [
      { id: 1, username: "admin", role: "ADMIN" },
      { id: 2, username: "ana", role: "EMPLOYEE" },
      { id: 3, username: "carlos", role: "CLIENT" },
    ];
  }

  const rows = users.map(u => `
    <tr class="border-b">
      <td class="p-2">${u.id}</td>
      <td class="p-2">${u.username}</td>
      <td class="p-2">${u.role}</td>
    </tr>`).join("");

  return DashboardLayout(`
    <h2 class="text-xl font-bold mb-4">Usuarios</h2>
    <div class="bg-white rounded-xl shadow overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr><th class="p-2 text-left">ID</th><th class="p-2 text-left">Usuario</th><th class="p-2 text-left">Rol</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}
