export function DashboardLayout(content: string) {
  return `
  <div class="flex h-screen bg-gray-100">
    <aside class="w-64 bg-white shadow-md p-4">
      <h2 class="text-xl font-bold mb-6">🏋️ Gimnasio</h2>
      <nav class="space-y-2">
        <a href="#/" class="block px-3 py-2 rounded hover:bg-gray-100">Dashboard</a>
        <a href="#/users" class="block px-3 py-2 rounded hover:bg-gray-100">Usuarios</a>
        <a href="#/clients" class="block px-3 py-2 rounded hover:bg-gray-100">Clientes</a>
        <a href="#/login" class="block px-3 py-2 rounded border">Salir</a>
      </nav>
    </aside>
    <main class="flex-1 p-6 overflow-y-auto">
      <header class="mb-4 border-b pb-2 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Panel</h1>
      </header>
      <section>${content}</section>
    </main>
  </div>`;
}
