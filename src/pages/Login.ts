import { login } from "../services/auth";
import { session } from "../store/session";

export function LoginPage() {
  if (session.isAuth()) { location.hash = "#/"; }

  setTimeout(() => {
    const form = document.getElementById("loginForm") as HTMLFormElement | null;
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const u = String(fd.get("user"));
      const p = String(fd.get("pass"));
      try {
        await login(u, p);
        location.hash = "#/";
      } catch (err) {
        alert("Login inválido o API no disponible");
      }
    });
  });

  return `
  <div class="min-h-screen grid place-items-center bg-gray-100">
    <form id="loginForm" class="bg-white p-6 rounded-2xl shadow w-96 space-y-3">
      <h2 class="text-2xl font-bold">Iniciar Sesión</h2>
      <div>
        <label class="text-sm">Usuario</label>
        <input name="user" class="w-full border rounded p-2" required />
      </div>
      <div>
        <label class="text-sm">Contraseña</label>
        <input type="password" name="pass" class="w-full border rounded p-2" required />
      </div>
      <button class="w-full bg-blue-600 text-white py-2 rounded">Entrar</button>
    </form>
  </div>`;
}
