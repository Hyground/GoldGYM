// --- Lógica de Membresías (Planes) ---

// Dependencias
// API_BASE_URL, token, userRoles, fetchAPI, contentArea, showMembresiaModal (modal específico), closeModal

async function loadMembresias() {
    console.log("[Membresias] Cargando análisis de planes...");
    // Llama al endpoint de analíticas
    const planesAnaliticas = await fetchAPI('/planes/analiticas');
    displayMembresias(planesAnaliticas);
}

function displayMembresias(planesAnaliticas) {
    contentArea.innerHTML = ''; // Limpiar
    console.log(`[Membresias] Renderizando ${planesAnaliticas?.length || 0} planes.`);

    if (!planesAnaliticas || planesAnaliticas.length === 0) {
        contentArea.innerHTML = '<p>No hay planes de membresía definidos.</p>'; return;
    }

    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'membership-center-wrapper';
    const grid = document.createElement('div');
    grid.className = 'membership-grid';
    const canEditOrDelete = userRoles.includes('ADMINISTRADOR'); // Solo Admin gestiona planes

    grid.innerHTML = planesAnaliticas.map(plan => {
        const planId = plan.id ?? 'N/A';
        const planNombre = plan.nombrePlan || plan.nombre || 'Plan Sin Nombre';
        const planPrecio = plan.precio != null ? Number(plan.precio).toFixed(2) : 'N/A';
        const planDuracion = plan.duracionDias ?? 'N/A';
        const planDesc = plan.descripcion || 'Sin descripción.';
        const planActivo = plan.activo;
        const totalClientes = plan.clientesActivos != null ? plan.clientesActivos : 0;
        const planReglas = plan.reglasAcceso || 'Sin reglas especificadas';
        const actionButtons = canEditOrDelete ? `<div class="membership-card-footer"><button class="action-btn btn-edit" data-id="${planId}" title="Editar Plan"><i class="material-icons">edit</i></button><button class="action-btn btn-delete" data-id="${planId}" title="Eliminar Plan"><i class="material-icons">delete</i></button></div>` : '';
        const inactiveClass = planActivo === false ? 'inactive-plan' : '';

        return `
        <div class="membership-card ${inactiveClass}">
             ${planActivo === false ? '<span class="inactive-badge">INACTIVO</span>' : ''}
            <div class="membership-card-header"><h3>${planNombre}</h3></div>
            <div class="membership-card-body">
                 <p class="price">Q${planPrecio}<span> / ${planDuracion} días</span></p>
                <p class="description">${planDesc}</p>
                <div class="plan-analytics">
                    <div class="analytics-item"><i class="material-icons">person</i><p><strong>${totalClientes}</strong> Clientes Activos</p></div>
                    <div class="analytics-item" title="${planReglas}"><i class="material-icons">gavel</i><p>Reglas: ${planReglas.substring(0, 20)}${planReglas.length > 20 ? '...' : ''}</p></div>
                </div>
            </div>
            ${actionButtons}
        </div>`;
    }).join('');

    gridWrapper.appendChild(grid);
    contentArea.appendChild(gridWrapper);
    console.log("[Membresias] Tarjetas renderizadas.");
}


// --- Modal Específico de Membresía (Plan) ---
function showMembresiaModal(data = null) {
    const isEdit = data !== null;
    modalTitle.textContent = isEdit ? 'Editar Plan de Membresía' : 'Crear Nuevo Plan';
    console.log(isEdit ? `[Membresias] Abriendo modal para editar ID ${data.id}` : "[Membresias] Abriendo modal para crear");

    if (!userRoles.includes('ADMINISTRADOR')) {
        alert('No tienes permiso para gestionar planes.'); return;
    }

    const defaults = { id: null, nombre: '', precio: '', duracionDias: '', descripcion: '', activo: true, reglasAcceso: '', ...(isEdit ? data : {}) };

    modalBody.innerHTML = `
    <form id="membresia-form" class="modal-form">
        <input type="hidden" id="planId" value="${defaults.id || ''}">
        <h4 class="form-title">Detalles del Plan</h4>
        <div class="form-grid">
            <div class="form-group full-width"><label for="nombre">Nombre</label><input type="text" id="nombre" class="input" value="${defaults.nombre}" required></div>
            <div class="form-group"><label for="precio">Precio (Q)</label><input type="number" id="precio" class="input" value="${defaults.precio}" min="0" step="0.01" required></div>
            <div class="form-group"><label for="duracion">Duración (días)</label><input type="number" id="duracion" class="input" value="${defaults.duracionDias}" min="1" required></div>
            <div class="form-group full-width"><label for="descripcion">Descripción</label><textarea id="descripcion" class="input" rows="2">${defaults.descripcion || ''}</textarea></div>
            <div class="form-group full-width"><label for="reglasAcceso">Reglas Acceso</label><input type="text" id="reglasAcceso" class="input" value="${defaults.reglasAcceso || ''}" placeholder="Ej: L-V 6am-10pm"></div>
            <div class="form-group full-width" style="margin-top: 1rem;"><label><input type="checkbox" id="activoPlan" ${defaults.activo !== false ? 'checked' : ''}> Plan Activo</label></div>
        </div>
        <div class="modal-footer"><button type="submit" class="btn-accent">${isEdit ? 'Guardar Cambios' : 'Crear Plan'}</button></div>
    </form>`;

    const form = document.getElementById('membresia-form');
    if (form) form.addEventListener('submit', handleMembresiaFormSubmit); else console.error("#membresia-form no encontrado");

    if (unifiedModal) unifiedModal.style.display = 'flex'; else console.error("#unified-modal no encontrado");
}

async function handleMembresiaFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements.planId?.value;
    const isEdit = id !== '';
    console.log(isEdit ? `[Membresias] Guardando cambios ID ${id}` : "[Membresias] Creando nuevo plan");

    const body = {
        nombre: form.elements.nombre?.value.trim(),
        precio: parseFloat(form.elements.precio?.value),
        duracionDias: parseInt(form.elements.duracion?.value),
        descripcion: form.elements.descripcion?.value.trim() || null,
        reglasAcceso: form.elements.reglasAcceso?.value.trim() || null,
        activo: form.elements.activoPlan?.checked ?? true
    };

    if (!body.nombre || isNaN(body.precio) || body.precio < 0 || isNaN(body.duracionDias) || body.duracionDias <= 0) {
        alert("Nombre, Precio válido y Duración válida (días) son obligatorios."); return;
    }

    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/planes/${id}` : `/planes`;

    try {
        await fetchAPI(url, { method, body });
        alert(`Plan ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
        closeModal();
        await loadMembresias(); // Recargar sección
    } catch (error) {
        console.error("[Membresias] Error guardando plan:", error);
        alert(`Error al guardar el plan: ${error.message}`);
    }
}
