document.addEventListener("DOMContentLoaded", async () => {
    const API_URL = "http://localhost:8080/api/clientes";
    const tablaBody = document.querySelector("tbody");
    const proximosDiv = document.querySelector("#vencimientos");
    const buscarInput = document.querySelector("#filtroNombre");
    const estadoSelect = document.querySelector("#selectEstado");
    const membresiaSelect = document.querySelector("#selectMembresia");
    const limpiarBtn = document.querySelector("#btnLimpiar");

    // ==============================
    // FUNCIÓN PRINCIPAL: CARGAR CLIENTES
    // ==============================
    async function cargarClientes() {
        tablaBody.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;
        try {
            const res = await fetch(API_URL, {
                headers: {
                    "Content-Type": "application/json",
                    // Si tu backend usa JWT, descomenta esta línea:
                    // "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const clientes = await res.json(); // Aquí llega una lista de ClienteResponseDTO
            renderClientes(clientes);
            renderProximosVencimientos(clientes);
        } catch (err) {
            console.error("Error al cargar clientes:", err);
            tablaBody.innerHTML = `<tr><td colspan="6" style="color:red;">Error al cargar datos (${err.message})</td></tr>`;
        }
    }

    // ==============================
    // RENDERIZAR TABLA DE CLIENTES
    // ==============================
    function renderClientes(clientes) {
        const filtro = buscarInput.value.toLowerCase();
        const estado = estadoSelect.value;
        const membresia = membresiaSelect.value;

        const filtrados = clientes.filter((c) => {
            const matchNombre = `${c.nombre} ${c.apellido}`.toLowerCase().includes(filtro);
            const matchEstado = estado === "Todos" || c.estado === estado;
            const matchMembresia = membresia === "Todas" || c.membresia === membresia;
            return matchNombre && matchEstado && matchMembresia;
        });

        if (filtrados.length === 0) {
            tablaBody.innerHTML = `<tr><td colspan="6">No se encontraron clientes</td></tr>`;
            return;
        }

        tablaBody.innerHTML = filtrados
            .map(
                (c) => `
        <tr>
          <td>${c.nombre} ${c.apellido}</td>
          <td>${c.email}</td>
          <td>${c.telefono || "-"}</td>
          <td>${c.membresia || "-"}</td>
          <td>${c.estado}</td>
          <td>${c.fechaVencimiento || "-"}</td>
        </tr>
      `
            )
            .join("");
    }

    // ==============================
    // RENDERIZAR PRÓXIMOS VENCIMIENTOS
    // ==============================
    function renderProximosVencimientos(clientes) {
        if (!proximosDiv) return;
        const hoy = new Date();

        const proximos = clientes
            .filter((c) => {
                if (!c.fechaVencimiento) return false;
                const dias = Math.ceil((new Date(c.fechaVencimiento) - hoy) / (1000 * 60 * 60 * 24));
                return dias >= 0 && dias <= 10;
            })
            .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

        if (proximos.length === 0) {
            proximosDiv.innerHTML = `<p>No hay vencimientos próximos</p>`;
            return;
        }

        proximosDiv.innerHTML = proximos
            .map((c) => {
                const diasRestantes = Math.ceil((new Date(c.fechaVencimiento) - hoy) / (1000 * 60 * 60 * 24));
                let color = "green";
                if (diasRestantes <= 3) color = "red";
                else if (diasRestantes <= 7) color = "yellow";

                return `
          <div class="venc-card">
            <strong>${c.nombre} ${c.apellido}</strong>
            <p style="color:${color}">${diasRestantes} días restantes</p>
            <small>${c.fechaVencimiento}</small>
            <div class="tag">${c.membresia}</div>
          </div>`;
            })
            .join("");
    }

    // ==============================
    // FILTROS
    // ==============================
    buscarInput?.addEventListener("input", cargarClientes);
    estadoSelect?.addEventListener("change", cargarClientes);
    membresiaSelect?.addEventListener("change", cargarClientes);
    limpiarBtn?.addEventListener("click", () => {
        buscarInput.value = "";
        estadoSelect.value = "Todos";
        membresiaSelect.value = "Todas";
        cargarClientes();
    });

    // Inicializar vista
    cargarClientes();
});
