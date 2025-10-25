// --- Lógica de Administradores ---

// Dependencias (Asumidas Globales o Pasadas)
// API_BASE_URL, token, userRoles, loggedInUserId, fetchAPI, contentArea, displayTable, showPersonaModal

async function loadAdministradores() {
    console.log("[Admin] Cargando lista de administradores...");
    // Espera que /api/usuarios devuelva List<UsuarioResponseDTO>
    const usuarios = await fetchAPI('/usuarios'); // Usa fetchAPI
    console.log("[Admin] Usuarios recibidos:", usuarios);
    // Filtrar por rol 'ADMINISTRADOR'
    const administradores = usuarios.filter(user => user.roles?.includes('ADMINISTRADOR'));
    console.log("[Admin] Administradores filtrados:", administradores);
    displayAdministradoresTable(administradores);
}

function displayAdministradoresTable(admins) {
    contentArea.innerHTML = ''; // Limpiar
    console.log(`[Admin] Renderizando tabla con ${admins?.length || 0} administradores.`);

    if (!admins || admins.length === 0) {
        contentArea.innerHTML = '<p>No hay administradores registrados.</p>'; return;
    }

    const table = document.createElement('table');
    table.className = 'content-table';
    const canEditOrDelete = userRoles.includes('ADMINISTRADOR'); // Solo Admin puede editar/eliminar admins
    let headers = ['ID', 'Nombre', 'Email', 'Username', 'Activo', 'Acciones'];
    if (!canEditOrDelete) headers = headers.filter(h => h !== 'Acciones');

    const rows = admins.map(admin => {
        const nombreCompleto = admin.nombrePersona || 'N/A';
        const email = admin.emailPersona || 'N/A';
        const username = admin.username || 'N/A';
        const activo = admin.activo;
        const activeStatus = activo ? 'Activo' : 'Inactivo';
        const statusClass = activo ? 'status-activo' : 'status-inactivo';
        const cells = `<td>${admin.id}</td><td>${nombreCompleto}</td><td>${email}</td><td>${username}</td><td><span class="status-badge ${statusClass}">${activeStatus}</span></td>`;
        let actionCells = '';
        if (canEditOrDelete) {
            const disableDelete = loggedInUserId && admin.id == loggedInUserId; // Evitar auto-eliminación
            actionCells = `<td class="action-cell"><button class="action-btn btn-edit" data-id="${admin.id}" title="Editar"><i class="material-icons">edit</i></button><button class="action-btn btn-delete" data-id="${admin.id}" title="${disableDelete ? 'No puedes eliminar tu propio usuario' : 'Eliminar'}" ${disableDelete ? 'disabled' : ''}><i class="material-icons">delete</i></button></td>`;
        }
        return `<tr>${cells}${actionCells}</tr>`;
    }).join('');
    table.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
    contentArea.appendChild(table);
    console.log("[Admin] Tabla renderizada.");
}

// La lógica de edición/creación es manejada por showPersonaModal/handlePersonaFormSubmit en modalLogic.js/ui.js
