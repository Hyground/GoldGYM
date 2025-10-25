// 🌟 Dashboard Empleado - Conexión total con API de GoldGYM + Modo offline + Ping preventivo 🌟
document.addEventListener("DOMContentLoaded", async () => {
    // 🔗 Endpoints principales
    const apiResumen = "https://goldgymapi-3.onrender.com/api";
    const apiActividad = "https://goldgymapi-3.onrender.com/api";

    // 🔹 Elementos del DOM
    const clientesActivosEl = document.getElementById("clientesActivos");
    const ventasHoyEl = document.getElementById("ventasHoy");
    const membresiasVencidasEl = document.getElementById("membresiasVencidas");
    const tablaBody = document.querySelector(".activity tbody");

    // ================================
    // 🧾 1️⃣ Cargar resumen general
    // ================================
    try {
        console.log("📊 Obteniendo resumen desde:", apiResumen);
        const resResumen = await fetch(apiResumen);
        if (!resResumen.ok) throw new Error(`Error HTTP ${resResumen.status}`);
        const dataResumen = await resResumen.json();

        console.log("✅ Resumen recibido:", dataResumen);

        // Mostrar datos en las tarjetas
        clientesActivosEl.textContent = dataResumen.clientesActivos ?? "0";
        ventasHoyEl.textContent = `$${dataResumen.ventasDelDia ?? 0}`;
        membresiasVencidasEl.textContent = dataResumen.membresiasVencidas ?? "0";

    } catch (error) {
        console.warn("⚠️ Error al obtener el resumen. Usando datos simulados:", error);
        // 🔁 Datos simulados de respaldo
        clientesActivosEl.textContent = "147";
        ventasHoyEl.textContent = "$4200";
        membresiasVencidasEl.textContent = "8";
    }

    // ================================
    // 📄 2️⃣ Cargar actividad reciente
    // ================================
    try {
        console.log("📋 Obteniendo actividad desde:", apiActividad);
        const resActividad = await fetch(apiActividad);
        if (!resActividad.ok) throw new Error(`Error HTTP ${resActividad.status}`);
        const dataActividad = await resActividad.json();

        console.log("✅ Actividad recibida:", dataActividad);

        // Limpiar tabla
        tablaBody.innerHTML = "";

        if (!dataActividad.length) {
            tablaBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align:center; color:gray;">
                        Sin actividad reciente
                    </td>
                </tr>`;
            return;
        }

        // Insertar filas con formato de fecha
        dataActividad.forEach(item => {
            const fecha = new Date(item.fecha);
            const fechaFormateada = fecha.toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });

            const fila = `
                <tr>
                    <td>${item.cliente}</td>
                    <td>${item.actividad}</td>
                    <td>${fechaFormateada}</td>
                </tr>`;
            tablaBody.insertAdjacentHTML("beforeend", fila);
        });

    } catch (error) {
        console.warn("⚠️ Error al cargar actividad. Usando datos simulados:", error);
        // 🔁 Datos simulados de respaldo
        tablaBody.innerHTML = `
            <tr><td>Juan Pérez</td><td>Pago membresía</td><td>10/10/2025</td></tr>
            <tr><td>María López</td><td>Compra suplemento</td><td>09/10/2025</td></tr>
            <tr><td>Carlos Díaz</td><td>Inscripción nueva</td><td>09/10/2025</td></tr>`;
    }

    // ================================
    // 🔄 3️⃣ Ping preventivo para Render
    // ================================
    setInterval(() => {
        fetch(apiResumen)
            .then(() => console.log("💤 Ping enviado para mantener vivo el servidor"))
            .catch(() => console.warn("⚠️ Falló el ping (Render dormido)"));
    }, 240000); // cada 4 minutos
});
