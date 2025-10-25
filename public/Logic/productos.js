// --- Lógica de Productos (Gestión de Inventario) ---

// Dependencias
// API_BASE_URL, token, userRoles, fetchAPI, contentArea, showProductModal (modal especifíco)

let productsCache = []; // Caché local para filtros

async function setupProductMarket() {
    console.log("[Productos] Configurando vista de gestión de inventario...");
    contentArea.innerHTML = `
    <div class="market-container">
        <div class="market-sidebar">
            <div class="card market-filters">
                <h3>Filtros y Búsqueda</h3>
                <div class="form-group full-width"><label for="search-input">Buscar Producto</label><input type="text" id="search-input" class="input" placeholder="Nombre o categoría..."></div>
                <div class="form-group full-width"><label for="category-filter">Categoría</label><select id="category-filter" class="input"><option value="">Todas</option><option value="SUPLEMENTO">Suplementos</option><option value="BEBIDA">Bebidas</option><option value="SNACK">Snacks</option><option value="EQUIPO">Equipo</option></select></div>
                <div class="form-group full-width"><label for="stock-filter">Stock</label><select id="stock-filter" class="input"><option value="">Mostrar Todo</option><option value="DISPONIBLE">Disponible (> 0)</option><option value="ALERTA">En Alerta (Stock Bajo)</option><option value="AGOTADO">Agotado (Stock 0)</option></select></div>
                <div class="form-group full-width"><label for="status-filter">Estado</label><select id="status-filter" class="input"><option value="">Todos</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></div>
            </div>
        </div>
        <div class="market-main">
            <div class="market-grid-header"><h2>Inventario</h2><span id="product-count"></span></div>
            <div id="product-grid" class="market-grid"><div class="loading-spinner"></div></div>
        </div>
    </div>`;

    try {
        productsCache = await fetchAPI('/productos'); // Cargar productos
        console.log(`[Productos] Productos recibidos (${productsCache.length}).`);

        const searchInput = document.getElementById('search-input');
        const categoryFilter = document.getElementById('category-filter');
        const stockFilter = document.getElementById('stock-filter');
        const statusFilter = document.getElementById('status-filter');

        // Añadir listeners (verificar si existen primero)
        if (searchInput) searchInput.addEventListener('input', applyFilters); else console.error("#search-input no encontrado");
        if (categoryFilter) categoryFilter.addEventListener('change', applyFilters); else console.error("#category-filter no encontrado");
        if (stockFilter) stockFilter.addEventListener('change', applyFilters); else console.error("#stock-filter no encontrado");
        if (statusFilter) statusFilter.addEventListener('change', applyFilters); else console.error("#status-filter no encontrado");

        applyFilters(); // Render inicial
        console.log("[Productos] Vista de inventario configurada.");
    } catch (error) {
        console.error("[Productos] Error fatal en setupProductMarket:", error);
        showError(contentArea, "Error al cargar el inventario", error); // Usa showError de ui.js
    }
}

function applyFilters() {
    console.log("[Productos] Aplicando filtros...");
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const stockFilter = document.getElementById('stock-filter');
    const statusFilter = document.getElementById('status-filter');
    const countSpan = document.getElementById('product-count');

    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const category = categoryFilter ? categoryFilter.value : '';
    const stockFilterValue = stockFilter ? stockFilter.value : '';
    const statusFilterValue = statusFilter ? statusFilter.value : '';

    const filteredProducts = productsCache.filter(p => {
        if (!p || typeof p.nombre !== 'string') return false;
        const nameMatch = p.nombre.toLowerCase().includes(search) || (p.categoria && p.categoria.toLowerCase().includes(search));
        const categoryMatch = !category || p.categoria === category;
        let stockMatch = true;
        const stock = p.stockCantidad ?? 0; const minStock = p.stockMinimoAlerta ?? 0;
        if (stockFilterValue === 'DISPONIBLE') stockMatch = stock > 0;
        else if (stockFilterValue === 'ALERTA') stockMatch = stock > 0 && minStock > 0 && stock <= minStock;
        else if (stockFilterValue === 'AGOTADO') stockMatch = stock <= 0;
        let statusMatch = true;
        if (statusFilterValue === 'ACTIVO') statusMatch = p.activo === true;
        else if (statusFilterValue === 'INACTIVO') statusMatch = p.activo === false;
        return nameMatch && categoryMatch && stockMatch && statusMatch;
    });

    console.log(`[Productos] Productos filtrados: ${filteredProducts.length}`);
    if (countSpan) countSpan.textContent = `(${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'})`;

    renderProductGrid(filteredProducts); // Re-renderizar con filtros
    console.log("[Productos] Filtros aplicados y cuadrícula renderizada.");
}

function renderProductGrid(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) { console.error("[Productos] Elemento #product-grid no encontrado."); return; }
    console.log(`[Productos] Renderizando ${products.length} productos en cuadrícula Market.`);
    if (products.length === 0) {
        grid.innerHTML = '<p>No se encontraron productos con los filtros aplicados.</p>'; return;
    }
    const canEditOrDelete = userRoles.includes('ADMINISTRADOR') || userRoles.includes('EMPLEADO'); // Permiso para botones

    grid.innerHTML = products.map(p => {
        if (!p || typeof p.nombre !== 'string') { console.warn("Producto inválido:", p); return ''; }
        const stock = p.stockCantidad ?? 0; const minStock = p.stockMinimoAlerta ?? 0;
        const isAgotado = stock <= 0; const stockAlert = !isAgotado && minStock > 0 && stock <= minStock;
        const stockClass = isAgotado ? 'stock-agotado' : (stockAlert ? 'stock-low' : 'stock-ok');
        const stockText = isAgotado ? 'Agotado' : `Stock: ${stock} ${p.tipoMedida || 'Und.'}`;
        const inactiveClass = p.activo === false ? 'inactive-product' : '';
        const actionButtons = canEditOrDelete ? `<div class="product-actions"><button class="action-btn btn-edit" data-id="${p.id}" title="Editar Producto"><i class="material-icons">edit</i></button><button class="action-btn btn-delete" data-id="${p.id}" title="Eliminar Producto"><i class="material-icons">delete</i></button></div>` : '';
        let icon = 'inventory_2';
        if (p.categoria === 'SUPLEMENTO') icon = 'fitness_center'; else if (p.categoria === 'BEBIDA') icon = 'local_drink'; else if (p.categoria === 'SNACK') icon = 'fastfood'; else if (p.categoria === 'EQUIPO') icon = 'style';
        return `<div class="product-card market-view ${stockClass} ${inactiveClass}" data-id="${p.id}">${p.activo === false ? '<span class="inactive-badge">INACTIVO</span>' : ''}<div class="product-image"><i class="material-icons product-icon">${icon}</i></div><div class="product-info"><h4 title="${p.nombre}">${p.nombre}</h4><p class="category">${p.categoria || 'General'}</p><p class="stock-info"><span>${stockText}</span></p><p class="product-price">Q${Number(p.precioVenta || 0).toFixed(2)}</p></div>${actionButtons}</div>`;
    }).join('');
}

// --- Modal específico de Producto ---
function showProductModal(data = null) {
    const isEdit = data !== null;
    modalTitle.textContent = isEdit ? `Editar Producto: ${data.nombre}` : 'Crear Nuevo Producto';
    console.log(isEdit ? `[Productos] Abriendo modal para editar ID ${data.id}` : "[Productos] Abriendo modal para crear");

    const defaults = { id: null, nombre: '', categoria: 'SUPLEMENTO', tipoMedida: 'UNIDAD', scoopsPorEnvase: null, precioVenta: '', stockCantidad: '', stockMinimoAlerta: 0, activo: true, ...(isEdit ? data : {}) };
    const scoopsValue = defaults.scoopsPorEnvase !== null ? defaults.scoopsPorEnvase : '';

    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('EMPLEADO')) {
        alert("No tienes permisos para crear/editar productos."); return;
    }

    modalBody.innerHTML = `
    <form id="product-form" class="modal-form">
        <input type="hidden" id="productId" value="${defaults.id || ''}">
        <h4 class="form-title">Información Principal</h4>
        <div class="form-grid">
            <div class="form-group full-width"><label for="nombre">Nombre</label><input type="text" id="nombre" class="input" value="${defaults.nombre}" required></div>
            <div class="form-group"><label for="categoria">Categoría</label><select id="categoria" class="input"><option value="SUPLEMENTO" ${defaults.categoria === 'SUPLEMENTO' ? 'selected' : ''}>Suplemento</option><option value="BEBIDA" ${defaults.categoria === 'BEBIDA' ? 'selected' : ''}>Bebida</option><option value="SNACK" ${defaults.categoria === 'SNACK' ? 'selected' : ''}>Snack</option><option value="EQUIPO" ${defaults.categoria === 'EQUIPO' ? 'selected' : ''}>Equipo</option></select></div>
            <div class="form-group"><label for="precioVenta">Precio Venta (Q)</label><input type="number" id="precioVenta" class="input" value="${defaults.precioVenta}" step="0.01" min="0" required></div>
        </div>
        <h4 class="form-title">Inventario y Medidas</h4>
        <div class="form-grid">
            <div class="form-group"><label for="stockCantidad">Stock Actual</label><input type="number" id="stockCantidad" class="input" value="${defaults.stockCantidad}" min="0" required></div>
            <div class="form-group"><label for="stockMinimoAlerta">Stock Mínimo Alerta</label><input type="number" id="stockMinimoAlerta" class="input" value="${defaults.stockMinimoAlerta}" min="0"></div>
            <div class="form-group"><label for="tipoMedida">Tipo Medida</label><select id="tipoMedida" class="input"><option value="UNIDAD" ${defaults.tipoMedida === 'UNIDAD' ? 'selected' : ''}>Unidad</option><option value="ENVASE" ${defaults.tipoMedida === 'ENVASE' ? 'selected' : ''}>Envase</option><option value="SCOOP" ${defaults.tipoMedida === 'SCOOP' ? 'selected' : ''}>Scoop/Porción</option></select></div>
            <div class="form-group"><label for="scoopsPorEnvase">Scoops/Porciones</label><input type="number" id="scoopsPorEnvase" class="input" value="${scoopsValue}" min="0" placeholder="Opcional"></div>
        </div>
        <div class="form-group full-width" style="margin-top: 1rem;"><label><input type="checkbox" id="activo" ${defaults.activo ? 'checked' : ''}> Producto Activo</label></div>
        <div class="modal-footer"><button type="submit" class="btn-accent">${isEdit ? 'Guardar Cambios' : 'Crear Producto'}</button></div>
    </form>`;

    const productForm = document.getElementById('product-form');
    if (productForm) productForm.addEventListener('submit', handleProductFormSubmit); else console.error("#product-form no encontrado");

    if (unifiedModal) unifiedModal.style.display = 'flex'; else console.error("#unified-modal no encontrado");
}

async function handleProductFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements.productId.value;
    const isEdit = id !== '';
    console.log(isEdit ? `[Productos] Guardando cambios ID ${id}` : "[Productos] Creando nuevo");

    const body = {
        nombre: form.elements.nombre.value.trim(),
        categoria: form.elements.categoria.value,
        precioVenta: parseFloat(form.elements.precioVenta.value),
        stockCantidad: parseFloat(form.elements.stockCantidad.value),
        stockMinimoAlerta: parseFloat(form.elements.stockMinimoAlerta.value) || 0,
        tipoMedida: form.elements.tipoMedida.value,
        scoopsPorEnvase: form.elements.scoopsPorEnvase.value ? parseInt(form.elements.scoopsPorEnvase.value) : null,
        activo: form.elements.activo.checked
    };

    if (!body.nombre || isNaN(body.precioVenta) || body.precioVenta < 0 || isNaN(body.stockCantidad) || body.stockCantidad < 0) {
        alert("Nombre, Precio válido y Stock válido son obligatorios."); return;
    }
    if (body.scoopsPorEnvase !== null && (isNaN(body.scoopsPorEnvase) || body.scoopsPorEnvase < 0)) {
        alert("Scoops/Porciones debe ser número positivo si se ingresa."); return;
    }

    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/productos/${id}` : `/productos`;

    try {
        await fetchAPI(url, { method, body }); // Usa fetchAPI y su manejo de errores
        alert(`Producto ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
        closeModal(); // Cierra modal desde ui.js
        await setupProductMarket(); // Recarga la sección completa para reflejar cambios
    } catch (error) {
        console.error(`[Productos] Error al guardar:`, error);
        alert(`Error al guardar el producto: ${error.message}`);
    }
}
