// --- Lógica de Pagos ---

// Dependencias
// API_BASE_URL, token, userRoles, fetchAPI, contentArea, showModal, closeModal, formatDisplayDate, setupClienteSearch

async function loadPagosSection() {
    console.log("[Pagos] Cargando sección...");
    contentArea.innerHTML = `
    <div class="pagos-container">
        <div class="pagos-sidebar card">
            <h3>Previsión de Vencimiento</h3>
            <div id="vencimientos-proximos"><div class="loading-spinner small"></div></div>
            <button id="add-pago-btn" class="btn-accent full-width" style="margin-top: 1.5rem;"><i class="material-icons">add</i> Registrar Pago</button>
        </div>
        <div class="pagos-main">
            <h2>Estado de Clientes (${new Date().toLocaleDateString('es-ES', { month: 'long' })})</h2>
            <div class="payment-client-grid" id="clientes-status-grid"><div class="loading-spinner"></div></div>
        </div>
    </div>`;

    const addPagoBtn = document.getElementById('add-pago-btn');
    if (addPagoBtn) {
        addPagoBtn.addEventListener('click', () => showPagoRegistroModal());
    } else {
        console.error("[Pagos] Botón 'add-pago-btn' no encontrado.");
    }

    try {
        // Usa fetchAPI
        const clientesStatus = await fetchAPI('/pagos/clientes-status');
        console.log("[Pagos] Datos de estado de clientes recibidos:", clientesStatus);
        displayPagos(clientesStatus);
        displayVencimientos(clientesStatus);
        console.log("[Pagos] Sección cargada.");
    } catch (error) {
        console.error("[Pagos] Error cargando status:", error);
        showError(contentArea, "Error al cargar estado de pagos", error); // Usa showError de ui.js
        const vencimientos = document.getElementById('vencimientos-proximos');
        if(vencimientos) vencimientos.innerHTML = `<p class="error">Error</p>`;
    }
}

function displayPagos(clientesStatus) {
    const grid = document.getElementById('clientes-status-grid');
    if (!grid) { console.error("[Pagos] Elemento #clientes-status-grid no encontrado."); return; }
    console.log(`[Pagos] Renderizando ${clientesStatus?.length || 0} tarjetas de estado.`);

    if (!clientesStatus || clientesStatus.length === 0) {
        grid.innerHTML = '<p>No hay clientes con estado de pago para mostrar.</p>'; return;
    }

    grid.innerHTML = clientesStatus.map(cliente => {
        const estadoPagoLower = cliente.estadoPago?.toLowerCase() || 'desconocido';
        const clienteId = cliente.clienteId ?? 'N/A';
        const nombreCompleto = cliente.nombreCompleto || 'Nombre Desconocido';
        const codigoCliente = cliente.codigoCliente || 'N/A';
        const correo = cliente.correo || 'N/A';
        const fechaVencimientoFormatted = formatDisplayDate(cliente.fechaVencimiento); // Usa helper de ui.js
        const montoPendienteFormatted = cliente.montoPendiente && cliente.montoPendiente > 0 ? `Q${Number(cliente.montoPendiente).toFixed(2)}` : '';

        return `
        <div class="payment-client-card status-${estadoPagoLower}">
            <div class="card-header">
                <h3>${nombreCompleto}</h3>
                <span class="status-badge ${estadoPagoLower}">${cliente.estadoPago || 'N/A'}</span>
            </div>
            <div class="card-body">
                <p><strong>Código:</strong> ${codigoCliente}</p>
                <p><strong>Email:</strong> ${correo}</p>
                ${fechaVencimientoFormatted !== 'N/A' ? `<p><strong>Vencimiento:</strong> ${fechaVencimientoFormatted}</p>` : ''}
                ${montoPendienteFormatted ? `<p class="monto-pendiente">Pendiente: <span>${montoPendienteFormatted}</span></p>` : ''}
            </div>
            <div class="actions">
                <button class="action-btn btn-history" data-id="${clienteId}" title="Ver Historial" ${clienteId === 'N/A' ? 'disabled' : ''}><i class="material-icons">history</i></button>
                <button class="action-btn btn-register-payment" data-id="${clienteId}" title="Registrar Pago" ${clienteId === 'N/A' ? 'disabled' : ''}><i class="material-icons">receipt</i></button>
            </div>
        </div>`;
    }).join('');

    // Listeners
    grid.querySelectorAll('.btn-register-payment').forEach(btn => {
        if (!btn.disabled) btn.addEventListener('click', () => showPagoRegistroModal(btn.dataset.id));
    });
    grid.querySelectorAll('.btn-history').forEach(btn => {
        if (!btn.disabled) btn.addEventListener('click', () => showHistorialPagosModal(btn.dataset.id));
    });
    console.log("[Pagos] Tarjetas de estado renderizadas.");
}

function displayVencimientos(clientesStatus) {
    const container = document.getElementById('vencimientos-proximos');
    if (!container) return;
    console.log("[Pagos] Actualizando sección de vencimientos...");

    const warningClients = clientesStatus.filter(c => c.estadoPago === 'AMARILLO' || c.estadoPago === 'ROJO');

    if (warningClients.length === 0) {
        container.innerHTML = '<p class="status-verde">¡Todos los clientes al día!</p>'; return;
    }

    container.innerHTML = warningClients.map(c => {
         let dateText = 'N/A';
         try {
             if (c.fechaVencimiento) {
                 // Usar helper, puede venir como string YYYY-MM-DD
                 const date = new Date(c.fechaVencimiento + 'T00:00:00Z'); // Asumir UTC
                 if (!isNaN(date.getTime())) {
                      dateText = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                 }
             }
         } catch(e) { console.warn("Error formateando fecha vencimiento (sidebar):", c.fechaVencimiento, e); }

        return `
        <div class="vencimiento-item status-${c.estadoPago.toLowerCase()}">
            <span>${c.nombreCompleto || 'Cliente Desconocido'}</span>
            <span class="vencimiento-date">${dateText}</span>
        </div>`;
    }).join('');
}


// --- Modales Específicos de Pagos ---

async function showPagoRegistroModal(clienteId = null) {
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('EMPLEADO')) {
        alert('No tienes permiso para registrar pagos.'); return;
    }
    const isRegistrationFromCard = clienteId !== null;
    modalTitle.textContent = 'Registro de Pago';
    console.log(isRegistrationFromCard ? `[Pagos] Abriendo modal registro para cliente ID ${clienteId}` : "[Pagos] Abriendo modal registro general");

    let clienteNombre = ''; let membresiaActivaId = ''; let montoSugerido = '';
    modalBody.innerHTML = '<div class="loading-spinner small">Cargando...</div>'; // Mostrar carga inicial
    if(unifiedModal) unifiedModal.style.display = 'flex';

    if (isRegistrationFromCard) {
        try {
            console.log(`[Pagos] Buscando datos cliente ${clienteId}...`);
            const clienteData = await fetchAPI(`/clientes/${clienteId}`); // Espera DTO
            clienteNombre = `${clienteData.nombre || ''} ${clienteData.apellido || ''}`.trim();
            // TODO: Buscar membresía activa y monto pendiente si endpoint existe
            console.log(`[Pagos] Buscando membresía activa cliente ${clienteId}... (Endpoint necesario)`);
            // const membresiaData = await fetchAPI(`/membresias/cliente/${clienteId}/activa`);
            // if (membresiaData) membresiaActivaId = membresiaData.id;
        } catch(error) {
            console.warn("[Pagos] Error buscando datos pre-registro:", error);
            alert(`Advertencia: No se pudieron cargar datos del cliente (${error.message}). Verifica la información.`);
        }
    }

    modalBody.innerHTML = `
    <form id="registro-pago-form" class="modal-form">
        <h4 class="form-title">Detalles del Pago</h4>
        <div class="form-grid">
            ${isRegistrationFromCard ?
                `<div class="form-group full-width"><label>Cliente</label><input type="text" class="input" value="${clienteNombre || 'No encontrado'} (ID: ${clienteId})" disabled><input type="hidden" id="clienteId" value="${clienteId}"></div>`
                :
                `<div class="form-group full-width"><label for="cliente-search">Buscar Cliente</label><input type="text" id="cliente-search" class="input" placeholder="ID, Nombre, Código..." required><div id="cliente-search-results"></div><input type="hidden" id="clienteId" required></div>`
            }
            <div class="form-group"><label for="membresiaId">ID Membresía a Pagar</label><input type="number" id="membresiaId" class="input" value="${membresiaActivaId}" placeholder="ID membresía" required></div>
            <div class="form-group"><label for="monto">Monto Pagado (Q)</label><input type="number" id="monto" class="input" step="0.01" value="${montoSugerido}" min="0.01" required></div>
            <div class="form-group"><label for="metodo">Método</label><select id="metodo" class="input" required><option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option></select></div>
            <div class="form-group full-width"><label for="notasPago">Notas</label><textarea id="notasPago" class="input" rows="2" placeholder="Opcional"></textarea></div>
        </div>
        <div class="modal-footer"><button type="submit" class="btn-accent">Confirmar Registro</button></div>
    </form>`;

    if (!isRegistrationFromCard) {
        setupClienteSearch(); // Activar búsqueda si es modal general (necesita ui.js)
    }
    const form = document.getElementById('registro-pago-form');
    if (form) form.addEventListener('submit', handlePagoFormSubmit);
}

async function handlePagoFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    console.log("[Pagos] Intentando registrar pago...");

    const body = {
        clienteId: parseInt(form.elements.clienteId?.value),
        membresiaId: parseInt(form.elements.membresiaId?.value),
        montoPagado: parseFloat(form.elements.monto?.value),
        metodo: form.elements.metodo?.value,
        notas: form.elements.notasPago?.value.trim() || null
    };

    if (isNaN(body.clienteId) || isNaN(body.membresiaId) || isNaN(body.montoPagado) || body.montoPagado <= 0 || !body.metodo) {
        alert("Verifica que ID Cliente, ID Membresía, Monto válido y Método estén correctos."); return;
    }
    console.log("[Pagos] Enviando datos:", body);

    try {
        await fetchAPI('/pagos', { method: 'POST', body }); // Usa fetchAPI
        alert(`Pago de Q${body.montoPagado.toFixed(2)} registrado con éxito.`);
        closeModal();
        await loadPagosSection(); // Recargar sección
    } catch (error) {
        console.error("[Pagos] Error al registrar:", error);
        alert(`Error al registrar el pago: ${error.message}`);
    }
}

async function showHistorialPagosModal(clienteId) {
    modalTitle.textContent = `Historial de Pagos (Cliente ID ${clienteId})`;
    modalBody.innerHTML = '<div class="loading-spinner small"></div>';
    if(unifiedModal) unifiedModal.style.display = 'flex';
    console.log(`[Pagos] Cargando historial para cliente ID ${clienteId}`);

    try {
        // Endpoint: /api/pagos/cliente/{id} (espera List<Pago>)
        const historial = await fetchAPI(`/pagos/cliente/${clienteId}`);
        console.log(`[Pagos] Historial recibido (${historial?.length || 0} items):`, historial);

        if (!historial || historial.length === 0) {
            modalBody.innerHTML = '<p>No se encontró historial de pagos para este cliente.</p>'; return;
        }
        // Ordenar por fecha descendente
        historial.sort((a, b) => new Date(b.pagadoEn || 0) - new Date(a.pagadoEn || 0));

        let tableHTML = `<table class="content-table"><thead><tr><th>ID Pago</th><th>Monto (Q)</th><th>Método</th><th>Fecha Pago</th><th>Membresía ID</th><th>Notas</th></tr></thead><tbody>`;
        historial.forEach(pago => {
            const fechaPagoFormatted = pago.pagadoEn ? new Date(pago.pagadoEn).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
            const membresiaId = pago.membresiaId ?? pago.membresia?.id ?? 'N/A';
            tableHTML += `<tr><td>${pago.id}</td><td>Q${Number(pago.montoPagado || 0).toFixed(2)}</td><td>${pago.metodo || 'N/A'}</td><td>${fechaPagoFormatted}</td><td>${membresiaId}</td><td>${pago.notas || ''}</td></tr>`;
        });
        tableHTML += `</tbody></table>`;
        modalBody.innerHTML = tableHTML;
        console.log("[Pagos] Historial renderizado.");

    } catch (error) {
        console.error("[Pagos] Error cargando historial:", error);
        showError(modalBody, "Error al cargar el historial", error);
    }
}
