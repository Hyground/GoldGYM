import { DashboardLayout } from "../layouts/DashboardLayout";

export function DashboardPage() {
  return DashboardLayout(`
    <div class="grid md:grid-cols-3 gap-4">
      <div class="bg-white shadow rounded-xl p-4">Usuarios: 150</div>
      <div class="bg-white shadow rounded-xl p-4">Clientes activos: 120</div>
      <div class="bg-white shadow rounded-xl p-4">Clases hoy: 8</div>
    </div>
  `);
}
