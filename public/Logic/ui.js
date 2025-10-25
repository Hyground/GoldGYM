// --- Lógica Común de UI ---

// --- Referencias DOM (Comunes) ---
const unifiedModal = document.getElementById('unified-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal-btn');
const deleteModal = document.getElementById('delete-confirmation-modal');
const deleteModalText = document.getElementById('delete-modal-text');
const confirmDeleteButton = document.getElementById('confirm-delete-button');
const cancelDeleteButton = document.getElementById('cancel-delete-button');
const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
const contentArea = document.getElementById('content-area'); // Usado por varios módulos

// --- Estado UI (Compartido si es necesario) ---
let currentIdToDelete = null;
let currentSectionForDelete = null;

// --- Funciones de Modal ---

function closeModal() {
    if (unifiedModal) unifiedModal.style.display = 'none';
    if (modalBody) modalBody.innerHTML = ''; // Limpiar para evitar listeners duplicados
    console.log("[UI] Modal unificado cerrado.");
}

function mostrarModalEliminacion(id, nombre, section) {
    console.log(`[UI] Abriendo modal de eliminación para ID ${id}, Nombre ${nombre}, Sección ${section}`);
    const userRoles = JSON.parse(sessionStorage.getItem('userRoles') || '[]'); // Obtener roles aquí
    const loggedInUserId = sessionStorage.getItem('userId'); // Obtener ID logueado

    // Solo ADMIN puede eliminar (ajustar si Empleado también puede)
    if (!userRoles.includes('ADMINISTRADOR')) {
        alert('No tienes permiso para eliminar.');
        return;
    }

    currentIdToDelete = id;
    if (section === 'membresias') currentSectionForDelete = 'planes';
    else if (section === 'administradores') currentSectionForDelete = 'usuarios';
    else currentSectionForDelete = section; // clientes, empleados, productos

    // Protección adicional: No eliminar el propio usuario logueado
    if (currentSectionForDelete === 'usuarios' && loggedInUserId && currentIdToDelete == loggedInUserId) {
        alert("No puedes eliminar tu propio usuario mientras estás logueado.");
        return;
    }

    if (deleteModalText) deleteModalText.innerHTML = `¿Estás seguro de que quieres eliminar <strong>${nombre} (ID: ${id})</strong>? Esta acción podría tener efectos en cascada y no se puede deshacer.`;
    if (deleteModal) deleteModal.style.display = 'flex';
}

function cerrarModalEliminacion() {
    if (deleteModal) deleteModal.style.display = 'none';
    currentIdToDelete = null;
    currentSectionForDelete = null;
    console.log("[UI] Modal de eliminación cerrado.");
}

async function confirmarEliminacion() {
    console.log(`[UI] Confirmando eliminación para ID ${currentIdToDelete}, Endpoint: ${currentSectionForDelete}`);
    if (currentIdToDelete && currentSectionForDelete) {
        // Deshabilitar botones mientras se procesa
        if (confirmDeleteButton) confirmDeleteButton.disabled = true;
        if (cancelDeleteButton) cancelDeleteButton.disabled = true;

        try {
            const url = `${API_BASE_URL}/${currentSectionForDelete}/${currentIdToDelete}`; // API_BASE_URL debe ser accesible
            await fetchAPI(url, { method: 'DELETE' }); // Usar fetchAPI
            alert(`Registro eliminado con éxito.`);
            let sectionToReload = currentSectionForDelete;
            if (currentSectionForDelete === 'planes') sectionToReload = 'membresias';
            if (currentSectionForDelete === 'usuarios') sectionToReload = 'administradores';
            // Necesitamos llamar a loadContent del módulo principal
            // Esto es una dependencia circular o requiere pasar la función.
            // Solución simple por ahora: Recargar la página (menos ideal)
             window.location.reload();
            // Solución mejor: Exponer loadContent globalmente o usar callbacks/eventos
            // if (typeof loadContent === 'function') {
            //     loadContent(sectionToReload);
            // } else {
            //     console.error("Función loadContent no accesible desde ui.js");
            //     window.location.reload(); // Recargar como fallback
            // }
        } catch (error) {
            console.error("[UI] Error al eliminar:", error);
            let userMessage = 'Error al eliminar.';
            if (error.message.toLowerCase().includes("constraint") || error.message.toLowerCase().includes("foreign key")) {
                 userMessage = `Error: No se puede eliminar este registro porque está siendo usado por otros (ej: pagos, membresías).`;
            } else if (error.status === 403) {
                 userMessage = "Error: No tienes permiso para eliminar este registro.";
            } else {
                 userMessage = `Error al eliminar: ${error.message}`;
            }
            alert(userMessage);
        } finally {
             // Habilitar botones de nuevo
             if (confirmDeleteButton) confirmDeleteButton.disabled = false;
             if (cancelDeleteButton) cancelDeleteButton.disabled = false;
             cerrarModalEliminacion(); // Cerrar modal independientemente del resultado
        }
    } else {
        console.warn("[UI] Intento de confirmar eliminación sin ID o sección válida.");
        cerrarModalEliminacion();
    }
}


// --- Helpers de Formato ---

// Formatea fechas YYYY-MM-DD o LocalDate a DD/MM/YYYY para mostrar en tablas/UI
function formatDisplayDate(dateInput) {
    if (!dateInput) return 'N/A';
    try {
        // Si es objeto LocalDate { year, monthValue, dayOfMonth }
        if (typeof dateInput === 'object' && dateInput.year) {
            return `${String(dateInput.dayOfMonth).padStart(2, '0')}/${String(dateInput.monthValue).padStart(2, '0')}/${dateInput.year}`;
        }
        // Si es string YYYY-MM-DD
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            const [year, month, day] = dateInput.split('-');
            return `${day}/${month}/${year}`;
        }
         // Otros casos (intentar parsear como fecha genérica, asumir UTC)
         const date = new Date(dateInput + 'T00:00:00Z');
         if (isNaN(date.getTime())) return 'Fecha Inválida'; // Verificar si es fecha válida
         // Usar formato específico DD/MM/YYYY
         const day = String(date.getUTCDate()).padStart(2, '0');
         const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Meses son 0-11
         const year = date.getUTCFullYear();
         return `${day}/${month}/${year}`;

    } catch (e) {
        console.warn("Error formateando fecha para display:", dateInput, e);
        return 'Fecha Inválida';
    }
}

// Formatea fecha para input type="date" (YYYY-MM-DD)
const formatInputDate = (dateInput) => {
      if (!dateInput) return '';
      try {
           // Si ya está en formato YYYY-MM-DD
           if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                return dateInput;
           }
           // Si es objeto LocalDate { year, monthValue, dayOfMonth }
           if (typeof dateInput === 'object' && dateInput.year) {
                return `${dateInput.year}-${String(dateInput.monthValue).padStart(2, '0')}-${String(dateInput.dayOfMonth).padStart(2, '0')}`;
           }
           // Intentar parsear como fecha genérica (asumir local si no hay 'Z')
           const date = new Date(dateInput);
           if (isNaN(date.getTime())) return ''; // Fecha inválida
           // Obtener año, mes, día LOCALES para el input
           const year = date.getFullYear();
           const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-11
           const day = String(date.getDate()).padStart(2, '0');
           return `${year}-${month}-${day}`;
      } catch (e) {
           console.warn("Error formateando fecha para input:", dateInput, e);
           return '';
      }
 };

 // --- Búsqueda de Cliente (Usado en Pagos) ---
 function setupClienteSearch() {
    const searchInput = document.getElementById('cliente-search');
    const resultsContainer = document.getElementById('cliente-search-results');
    const clienteIdInput = document.getElementById('clienteId');
    let searchTimeout;

     if (!searchInput || !resultsContainer || !clienteIdInput) {
          console.error("[UI] Elementos necesarios para búsqueda de cliente no encontrados.");
          return;
     }

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        resultsContainer.innerHTML = '';
        clienteIdInput.value = ''; // Limpiar ID

        if (query.length < 2) {
             resultsContainer.style.display = 'none'; return;
        }

        resultsContainer.innerHTML = '<div class="search-loading">Buscando...</div>';
        resultsContainer.style.display = 'block';
         console.log(`[UI] Buscando clientes con query: ${query}`);

        searchTimeout = setTimeout(async () => {
            try {
                // Endpoint debe devolver List<ClienteResponseDTO>
                const clientes = await fetchAPI(`/clientes/buscar?query=${encodeURIComponent(query)}`); // Usa fetchAPI
                 console.log(`[UI] Clientes encontrados: ${clientes.length}`);

                if (clientes.length === 0) {
                    resultsContainer.innerHTML = '<div class="search-no-results">No se encontraron clientes.</div>'; return;
                }

                resultsContainer.innerHTML = clientes.map(c => `
                    <div class="search-result-item" data-id="${c.id}" data-name="${c.nombrePersona || ''}">
                         ${c.nombrePersona || 'Sin Nombre'} (${c.codigoCliente || c.emailPersona || 'ID: '+c.id})
                    </div>`).join('');

                 resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                      item.addEventListener('click', () => {
                           const selectedName = item.dataset.name; const selectedId = item.dataset.id;
                           searchInput.value = selectedName; clienteIdInput.value = selectedId;
                           resultsContainer.innerHTML = ''; resultsContainer.style.display = 'none';
                            console.log(`[UI] Cliente seleccionado: ID ${selectedId}, Nombre ${selectedName}`);
                           // TODO: Buscar membresía activa del cliente
                      });
                 });

            } catch (error) {
                console.error("[UI] Error buscando cliente:", error);
                resultsContainer.innerHTML = '<div class="search-error">Error al buscar.</div>';
            }
        }, 300);
    });

     // Ocultar resultados si se hace clic fuera
     document.addEventListener('click', (e) => {
          if (resultsContainer && !resultsContainer.contains(e.target) && e.target !== searchInput) {
               resultsContainer.style.display = 'none';
          }
     });
}

// --- Otras Funciones UI Comunes (si las hubiera) ---

// Ejemplo: Mostrar un mensaje de error genérico en contentArea
function showError(container, message, errorDetails) {
    console.error(message, errorDetails); // Log completo del error
    let userMessage = `${message}.`;
    if (errorDetails?.status === 403) userMessage += " No tienes permiso.";
    else if (errorDetails?.status === 404) userMessage += " No encontrado.";
    else if (errorDetails?.status === 500) userMessage += " Error interno del servidor.";
    else if (errorDetails?.message?.includes("fetch")) userMessage = "Error de red al conectar con API.";
    container.innerHTML = `<p class="error">${userMessage} (Revisa consola)</p>`;
}

// Podríamos exponer las funciones necesarias globalmente o bajo un namespace
// Por simplicidad, asumiremos que son globales por ahora, pero un namespace es mejor:
// window.UI = { closeModal, mostrarModalEliminacion, ... };
