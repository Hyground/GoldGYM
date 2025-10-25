// --- Lógica de Empleados ---

// Dependencias (Asumidas Globales o Pasadas)
// API_BASE_URL, token, userRoles, fetchAPI, contentArea, displayTable, showPersonaModal, formatDisplayDate

async function loadEmpleados() {
    console.log("[Empleados] Cargando lista de empleados...");
    // Espera que /api/empleados devuelva List<EmpleadoResponseDTO>
    const empleados = await fetchAPI('/empleados'); // Usa fetchAPI
    displayTableEmpleados(empleados);
}

function displayTableEmpleados(data) {
    contentArea.innerHTML = ''; // Limpiar área
    console.log(`[Empleados] Renderizando tabla con ${data?.length || 0} empleados.`);

    if (!data || data.length === 0) {
        contentArea.innerHTML = `<p>No hay empleados para mostrar.</p>`;
        return;
    }

    const table = document.createElement('table');
    table.className = 'content-table';
    const canEditOrDelete = userRoles.includes('ADMINISTRADOR'); // Solo Admin puede editar/borrar
    let headers = ['ID', 'Nombre', 'Email', 'Salario', 'Contratación', 'Activo', 'Acciones'];
    if (!canEditOrDelete) headers = headers.filter(h => h !== 'Acciones');

    const rows = data.map(item => {
        const activeStatus = item.activo ? 'Activo' : 'Inactivo';
        const statusClass = item.activo ? 'status-activo' : 'status-inactivo';
        const nombreCompleto = item.nombrePersona || `${item.nombre || ''} ${item.apellido || ''}`.trim() || 'N/A';
        const email = item.emailPersona || item.correo || 'N/A';
        const salarioFormatted = item.salario != null ? `Q${Number(item.salario).toFixed(2)}` : 'N/A';
        let fechaContratacionFormatted = 'N/A';
        try {
            if (item.fechaContratacion) {
                fechaContratacionFormatted = formatDisplayDate(item.fechaContratacion); // Usa helper de ui.js
            }
        } catch (e) { console.warn("Error formateando fecha contratación tabla:", item.fechaContratacion, e); }

        const commonCells = `<td>${item.id}</td><td>${nombreCompleto}</td><td>${email}</td>`;
        const specificCells = `<td>${salarioFormatted}</td><td>${fechaContratacionFormatted}</td><td><span class="status-badge ${statusClass}">${activeStatus}</span></td>`;
        let actionCells = '';
        if (canEditOrDelete) {
            actionCells = `<td class="action-cell"><button class="action-btn btn-edit" data-id="${item.id}" title="Editar"><i class="material-icons">edit</i></button><button class="action-btn btn-delete" data-id="${item.id}" title="Eliminar"><i class="material-icons">delete</i></button></td>`;
        }
        return `<tr>${commonCells}${specificCells}${actionCells}</tr>`;
    }).join('');

    table.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
    contentArea.appendChild(table);
    console.log(`[Empleados] Tabla renderizada.`);
}

// La lógica de edición/creación es manejada por showPersonaModal/handlePersonaFormSubmit en modalLogic.js/ui.js
