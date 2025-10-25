// --- Lógica de Clientes ---

// Dependencias (Asumidas Globales o Pasadas)
// API_BASE_URL, token, userRoles, fetchAPI, contentArea, displayTable, showPersonaModal, formatDisplayDate

async function loadClientes() {
    console.log("[Clientes] Cargando lista de clientes...");
    // Espera que /api/clientes devuelva List<ClienteResponseDTO>
    const clientes = await fetchAPI('/clientes'); // Usa fetchAPI
    displayTableClientes(clientes); // Llama a una función display específica si es necesario diferenciarla mucho
}

function displayTableClientes(data) {
    contentArea.innerHTML = ''; // Limpiar área
    console.log(`[Clientes] Renderizando tabla con ${data?.length || 0} clientes.`);

    if (!data || data.length === 0) {
        contentArea.innerHTML = `<p>No hay clientes para mostrar.</p>`;
        return;
    }

    const table = document.createElement('table');
    table.className = 'content-table';
    const canEditOrDelete = userRoles.includes('ADMINISTRADOR'); // Solo Admin puede editar/borrar
    let headers = ['ID', 'Nombre', 'Email', 'Código', 'Activo', 'Acciones'];
    if (!canEditOrDelete) headers = headers.filter(h => h !== 'Acciones');

    const rows = data.map(item => {
        const activeStatus = item.activo ? 'Activo' : 'Inactivo';
        const statusClass = item.activo ? 'status-activo' : 'status-inactivo';
        const nombreCompleto = item.nombrePersona || `${item.nombre || ''} ${item.apellido || ''}`.trim() || 'N/A';
        const email = item.emailPersona || item.correo || 'N/A';

        const commonCells = `<td>${item.id}</td><td>${nombreCompleto}</td><td>${email}</td>`;
        const specificCells = `<td>${item.codigoCliente || 'N/A'}</td><td><span class="status-badge ${statusClass}">${activeStatus}</span></td>`;
        let actionCells = '';
        if (canEditOrDelete) {
            actionCells = `<td class="action-cell"><button class="action-btn btn-edit" data-id="${item.id}" title="Editar"><i class="material-icons">edit</i></button><button class="action-btn btn-delete" data-id="${item.id}" title="Eliminar"><i class="material-icons">delete</i></button></td>`;
        }
        return `<tr>${commonCells}${specificCells}${actionCells}</tr>`;
    }).join('');

    table.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
    contentArea.appendChild(table);
    console.log(`[Clientes] Tabla renderizada.`);
}

// Nota: La lógica de showPersonaModal y handlePersonaFormSubmit
// está ahora en modalLogic.js (o ui.js si se prefiere)
// porque es compartida entre Clientes, Empleados y Administradores.
// handleEdit también está en el archivo principal (dashboardadmin.js)
// porque actúa como despachador.
