import { DashboardLayout } from "../layouts/DashboardLayout";
import { api } from "../services/api";

type ClientDTO = { id: number; name: string; membership?: string };

export async function ClientsPage() {
  let clients: ClientDTO[] = [];
  try {
    clients = await api.get<ClientDTO[]>("/clients");
  } catch {
    clients = [
      { id: 101, name: "María López", membership: "Mensual" },
      { id: 102, name: "Luis Pérez",  membership: "Anual"   },
      { id: 103, name: "Sofía Díaz",  membership: "Trimestral" },
    ];
  }

  const rows = clients.map(c => `
    <tr class="border-b">
      <td class="p-2">${c.id}</td>
      <td class="p-2">${c.name}</td>
      <td class="p-2">${c.membership ?? "-"}</td>
    </tr>`).join("");

  return DashboardLayout(`
    <h2 class="text-xl font-bold mb-4">Clientes</h2>
    <div class="bg-white rounded-xl shadow overflow-x-auto">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr><th class="p-2 text-left">ID</th><th class="p-2 text-left">Nombre</th><th class="p-2 text-left">Membresía</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}
