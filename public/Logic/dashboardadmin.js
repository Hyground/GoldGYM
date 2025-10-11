document.addEventListener('DOMContentLoaded', () => {
    // --- DOM REFERENCES ---
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const usernameDisplay = document.getElementById('username-display');
    const logoutButton = document.getElementById('logout');
    const contentArea = document.getElementById('content-area');
    const sectionTitle = document.getElementById('section-title');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const fab = document.getElementById('fab');
    // Modals
    const unifiedModal = document.getElementById('unified-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const deleteModal = document.getElementById('delete-confirmation-modal');
    const deleteModalText = document.getElementById('delete-modal-text');
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');

    // --- STATE ---
    const API_BASE_URL = 'https://goldgymapi-3.onrender.com/api';
    const token = sessionStorage.getItem('authToken');
    const username = sessionStorage.getItem('username');
    const userRoles = JSON.parse(sessionStorage.getItem('userRoles') || '[]'); // Obtener la lista de roles

    let cart = []; // POS cart state
    let currentIdToDelete = null;
    let currentSectionForDelete = null;
    let productsCache = []; // Cache for products in POS

    // --- INITIALIZATION ---
    if (!token) { window.location.href = 'index.html'; return; }
    initializeUI();
    initializeEventListeners();
    loadContent('clientes');

    // --- INITIALIZERS ---
    function initializeUI() {
        usernameDisplay.textContent = username;
        // Ocultar el FAB si el rol no tiene permiso para crear (p. ej., si solo es Cliente)
        if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('EMPLEADO')) {
            if (fab) fab.style.display = 'none';
        }
    }

    function initializeEventListeners() {
        themeToggleButton.addEventListener('click', () => typeof toggleTheme === 'function' && toggleTheme());
        logoutButton.addEventListener('click', (e) => { e.preventDefault(); sessionStorage.clear(); window.location.href = 'index.html'; });
        navLinks.forEach(link => link.addEventListener('click', handleNavClick));
        if (fab) fab.addEventListener('click', handleFabClick);
        // Modals
        closeModalBtn.addEventListener('click', closeModal);
        unifiedModal.addEventListener('click', e => { if (e.target === unifiedModal) closeModal(); });
        if (deleteModal) deleteModal.addEventListener('click', e => { if (e.target === deleteModal) cerrarModalEliminacion(); });
        if (cancelDeleteButton) cancelDeleteButton.addEventListener('click', cerrarModalEliminacion);
        if (confirmDeleteButton) confirmDeleteButton.addEventListener('click', confirmarEliminacion);
        // Content Area Delegation
        contentArea.addEventListener('click', handleContentAreaClick);
    }

    // --- EVENT HANDLERS ---
    function handleNavClick(e) {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        loadContent(this.dataset.section);
    }

    function handleFabClick() {
        const section = document.querySelector('.sidebar-nav a.active').dataset.section;
        if (section === 'clientes' || section === 'empleados') {
            showPersonaModal(null, section);
        } else if (section === 'membresias') {
            showMembresiaModal();
        } else if (section === 'productos') { // Manejar FAB para productos
            showProductModal();
        } else if (section === 'pagos') {
            alert('Funcionalidad de añadir pago no implementada aún.');
        }
    }

    async function handleContentAreaClick(e) {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');
        const productCard = e.target.closest('.product-card');

        const section = document.querySelector('.sidebar-nav a.active').dataset.section;

        if (editBtn) {
            const id = editBtn.dataset.id;
            handleEdit(id, section);
        } else if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            let name = '';
            if (section === 'membresias') {
                name = deleteBtn.closest('.membership-card')?.querySelector('h3').textContent;
            } else if (section === 'pagos') {
                name = deleteBtn.closest('.payment-client-card')?.querySelector('h3').textContent;
            } else {
                name = deleteBtn.closest('tr').querySelector('td:nth-child(2)').textContent;
            }
            mostrarModalEliminacion(id, name, section);
        } else if (productCard && section === 'ventas') {
            const id = productCard.dataset.id;
            const product = productsCache.find(p => p.id == id); // Use cached products
            if (product) addToCart(product);
        }
    }


    // Nueva función para llenar la barra lateral de vencimientos
    function displayVencimientos(clientesStatus) {
        const container = document.getElementById('vencimientos-proximos');
        // Filtra los clientes con estado AMARILLO (próximo a vencer) o ROJO (vencido/en deuda)
        const warningClients = clientesStatus.filter(c => c.estadoPago === 'AMARILLO' || c.estadoPago === 'ROJO');

        if (warningClients.length === 0) {
            container.innerHTML = '<p class="status-verde">¡Todos los clientes están al día!</p>';
            return;
        }

        container.innerHTML = warningClients.map(c => {
            const dateText = c.fechaVencimiento ? new Date(c.fechaVencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'N/A';
            return `
            <div class="vencimiento-item status-${c.estadoPago}">
                <span>${c.nombreCompleto}</span>
                <span class="vencimiento-date">${dateText}</span>
            </div>
        `;
        }).join('');
    }
    async function handleEdit(id, section) {
        const endpoint = section === 'membresias' ? 'planes' : section;
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            const data = await response.json();

            if (section === 'clientes' || section === 'empleados') {
                showPersonaModal(data, section);
            } else if (section === 'membresias') {
                showMembresiaModal(data);
            } else if (section === 'productos') { // Manejar edición de productos
                showProductModal(data);
            } else if (section === 'pagos') {
                alert('Funcionalidad de edición de pagos no implementada aún.');
            }
        } catch (error) { alert(`Error al cargar datos para edición: ${error.message}`); }
    }

    function showProductModal(data = null) {
    const isEdit = data !== null;
    modalTitle.textContent = isEdit ? `Editar Producto: ${data.nombre}` : 'Crear Nuevo Producto';
    
    const defaults = {
        nombre: '', categoria: 'SUPLEMENTO', tipoMedida: 'UNIDAD', scoopsPorEnvase: 0, precioVenta: 0.00,
        stockCantidad: 0, stockMinimoAlerta: 0, activo: true,
        ...(isEdit ? data : {})
    };
    
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('EMPLEADO')) {
        alert("No tienes permisos para crear/editar productos.");
        return;
    }

    modalBody.innerHTML = `
        <form id="product-form" class="modal-form">
            <input type="hidden" id="productId" value="${isEdit ? defaults.id : ''}">
            <h4 class="form-title">Información Principal</h4>
            <div class="form-grid">
                <div class="form-group full-width"><label for="nombre">Nombre</label><input type="text" id="nombre" class="input" value="${defaults.nombre}" required></div>
                
                <div class="form-group"><label for="categoria">Categoría</label>
                    <select id="categoria" class="input">
                        <option value="SUPLEMENTO" ${defaults.categoria === 'SUPLEMENTO' ? 'selected' : ''}>Suplemento</option>
                        <option value="BEBIDA" ${defaults.categoria === 'BEBIDA' ? 'selected' : ''}>Bebida</option>
                        <option value="SNACK" ${defaults.categoria === 'SNACK' ? 'selected' : ''}>Snack</option>
                        <option value="EQUIPO" ${defaults.categoria === 'EQUIPO' ? 'selected' : ''}>Equipo</option>
                    </select>
                </div>
                
                <div class="form-group"><label for="precioVenta">Precio Venta ($)</label><input type="number" id="precioVenta" class="input" value="${defaults.precioVenta || 0}" step="0.01" required></div>
            </div>
            
            <h4 class="form-title">Inventario y Medidas</h4>
            <div class="form-grid">
                <div class="form-group"><label for="stockCantidad">Stock Actual</label><input type="number" id="stockCantidad" class="input" value="${defaults.stockCantidad || 0}" required></div>
                <div class="form-group"><label for="stockMinimoAlerta">Stock Mínimo Alerta</label><input type="number" id="stockMinimoAlerta" class="input" value="${defaults.stockMinimoAlerta || 0}"></div>
                
                <div class="form-group"><label for="tipoMedida">Tipo Medida</label>
                    <select id="tipoMedida" class="input">
                        <option value="UNIDAD" ${defaults.tipoMedida === 'UNIDAD' ? 'selected' : ''}>Unidad (Botella, Barra)</option>
                        <option value="ENVASE" ${defaults.tipoMedida === 'ENVASE' ? 'selected' : ''}>Envase (Proteína)</option>
                    </select>
                </div>
                
                <div class="form-group"><label for="scoopsPorEnvase">Scoops/Porciones (si aplica)</label><input type="number" id="scoopsPorEnvase" class="input" value="${defaults.scoopsPorEnvase || 0}"></div>
            </div>
            
            <div class="form-group full-width" style="margin-top: 1rem;">
                <label><input type="checkbox" id="activo" ${defaults.activo ? 'checked' : ''}> Producto Activo (Disponible para venta)</label>
            </div>
            
            <div class="modal-footer"><button type="submit" class="btn-accent">${isEdit ? 'Guardar Cambios' : 'Crear Producto'}</button></div>
        </form>
    `;
    document.getElementById('product-form').addEventListener('submit', handleProductFormSubmit);
    unifiedModal.style.display = 'flex';
}

async function handleProductFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements.productId.value;
    const isEdit = id !== '';
    
    const body = {
        nombre: form.elements.nombre.value,
        categoria: form.elements.categoria.value,
        precioVenta: parseFloat(form.elements.precioVenta.value),
        stockCantidad: parseFloat(form.elements.stockCantidad.value),
        stockMinimoAlerta: parseFloat(form.elements.stockMinimoAlerta.value),
        tipoMedida: form.elements.tipoMedida.value,
        // Usar parseInt y asegurar que es 0 si está vacío
        scoopsPorEnvase: parseInt(form.elements.scoopsPorEnvase.value || 0),
        activo: form.elements.activo.checked
    };

    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `${API_BASE_URL}/productos/${id}` : `${API_BASE_URL}/productos`;
    
    try {
        const response = await fetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify(body) 
        });

        if (!response.ok) { 
            const errorData = await response.text(); 
            throw new Error(errorData || `Error ${response.status}`); 
        }

        alert(`Producto ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
        closeModal();
        loadContent('productos'); 
    } catch (error) { 
        alert(`Error al guardar el producto: ${error.message}`); 
    }
}
    // --- CORE LOGIC ---
    async function loadContent(section) {
    sectionTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    contentArea.innerHTML = '<p>Cargando...</p>';
    fab.style.display = (section === 'ventas') ? 'none' : 'block';

    if (section === 'ventas') {
        await setupPOSInterface();
    } else if (section === 'pagos') {
        await loadPagosSection();
    } else if (section === 'productos') {
        await setupProductMarket();
    } else if (section === 'membresias') { // Lógica para Membresías
        try {
            // DEBE LLAMARSE AL ENDPOINT DE ANALÍTICAS QUE DEVUELVE LOS PLANES
            const response = await fetch(`${API_BASE_URL}/planes/analiticas`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            // Usamos la función con el objeto PlanAnaliticasDTO
            displayMembresias(await response.json()); 
        } catch (error) { 
            contentArea.innerHTML = `<p>Error al cargar los datos de ${section}: ${error.message}</p>`; 
        }
    } else {
        // Lógica para Clientes/Empleados (que usa displayTable)
        const endpoint = section; 
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            displayTable(await response.json(), section);
        } catch (error) { contentArea.innerHTML = `<p>Error al cargar los datos de ${section}: ${error.message}</p>`; }
    }
}

    async function setupProductMarket() {
        contentArea.innerHTML = `
        <div class="market-container">
            <div class="market-sidebar">
                <div class="card market-filters">
                    <h3>Filtros y Búsqueda</h3>
                    <div class="form-group full-width">
                        <label for="search-input">Buscar Producto</label>
                        <input type="text" id="search-input" class="input" placeholder="Nombre o categoría...">
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="category-filter">Categoría</label>
                        <select id="category-filter" class="input">
                            <option value="">Todas</option>
                            <option value="SUPLEMENTO">Suplementos</option>
                            <option value="BEBIDA">Bebidas</option>
                            <option value="SNACK">Snacks</option>
                            <option value="EQUIPO">Equipo</option>
                        </select>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="stock-filter">Stock</label>
                        <select id="stock-filter" class="input">
                            <option value="">Mostrar Todo</option>
                            <option value="ALERTA">En Alerta (Stock Bajo)</option>
                            <option value="AGOTADO">Agotado (Stock 0)</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="market-main">
                <div class="market-grid-header">
                    <h2>Inventario</h2>
                </div>
                <div id="product-grid" class="market-grid">
                    <p>Cargando productos...</p>
                </div>
            </div>
        </div>
    `;

        try {
            const response = await fetch(`${API_BASE_URL}/productos`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            const products = await response.json();
            productsCache = products; // Guardar en caché para filtros

            // Inicializar listeners para búsqueda y filtrado dinámico
            document.getElementById('search-input').addEventListener('input', applyFilters);
            document.getElementById('category-filter').addEventListener('change', applyFilters);
            document.getElementById('stock-filter').addEventListener('change', applyFilters);

            renderProductGrid(products);
        } catch (error) {
            document.getElementById('product-grid').innerHTML = `<p>Error al cargar el inventario: ${error.message}</p>`;
        }
    }

    function applyFilters() {
        const search = document.getElementById('search-input').value.toLowerCase();
        const category = document.getElementById('category-filter').value;
        const stockFilter = document.getElementById('stock-filter').value;

        const filteredProducts = productsCache.filter(p => {
            // Filtro de búsqueda (nombre o categoría)
            const nameMatch = p.nombre.toLowerCase().includes(search) || (p.categoria && p.categoria.toLowerCase().includes(search));
            // Filtro de categoría
            const categoryMatch = !category || p.categoria === category;
            // Filtro de Stock
            let stockMatch = true;
            if (stockFilter === 'ALERTA') {
                stockMatch = p.stockCantidad > 0 && p.stockCantidad <= p.stockMinimoAlerta;
            } else if (stockFilter === 'AGOTADO') {
                stockMatch = p.stockCantidad <= 0;
            }

            return nameMatch && categoryMatch && stockMatch;
        });

        renderProductGrid(filteredProducts);
    }

    function displayData(data, section) {
        contentArea.innerHTML = ''; // Clear loading message
        if (data.length === 0) {
            contentArea.innerHTML = `<p>No hay ${section} para mostrar.</p>`;
            return;
        }
        // Original logic (uncommented)
        if (section === 'membresias') {
            displayMembresias(data);
        } else if (section === 'pagos') {
            displayPagos(data);
        } else {
            displayTable(data, section);
        }
    }

    function displayTable(data, section) {
        const table = document.createElement('table');
        table.className = 'content-table';

        // Check if the user has permission for editing/deleting (ADMIN or EMPLEADO)
        const canEditOrDelete = userRoles.includes('ADMINISTRADOR') || userRoles.includes('EMPLEADO');

        // Headers definition
        let headers = [];
        if (section === 'clientes') {
            // Nota: Asumo que el campo "Email" viene de 'emailPersona' o 'correoPersona'
            headers = ['ID', 'Nombre', 'Email', 'Código', 'Activo', 'Acciones'];
            if (!canEditOrDelete) headers = headers.filter(h => h !== 'Acciones'); // Ocultar columna si no tiene permiso
        } else { // Empleados
            headers = ['ID', 'Nombre', 'Email', 'Salario', 'Contratación', 'Activo', 'Acciones'];
            if (!canEditOrDelete) headers = headers.filter(h => h !== 'Acciones');
        }

        const rows = data.map(item => {
            // Determinar el estado para el badge
            const activeStatus = item.activo ? 'Activo' : 'Inactivo';
            const statusClass = item.activo ? 'status-activo' : 'status-inactivo';

            const commonCells = `
            <td>${item.id}</td>
            <td>${item.nombrePersona || item.nombre || 'N/A'}</td>
            <td>${item.emailPersona || item.correoPersona || 'N/A'}</td>
        `;

            let specificCells = '';
            if (section === 'clientes') {
                specificCells = `
                <td>${item.codigoCliente || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${activeStatus}</span></td>
            `;
            } else { // Empleados
                specificCells = `
                <td>${item.salario ? `$${item.salario.toFixed(2)}` : 'N/A'}</td>
                <td>${item.fechaContratacion || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${activeStatus}</span></td>
            `;
            }

            // Cell for Actions (only render if the user has permission)
            let actionCells = '';
            if (canEditOrDelete) {
                actionCells = `
                <td class="action-cell">
                    <button class="action-btn btn-edit" data-id="${item.id}" title="Editar"><i class="material-icons">edit</i></button>
                    <button class="action-btn btn-delete" data-id="${item.id}" title="Eliminar"><i class="material-icons">delete</i></button>
                </td>
            `;
            }

            return `<tr>${commonCells}${specificCells}${actionCells}</tr>`;
        }).join('');

        table.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
        contentArea.appendChild(table);
    }

    function displayMembresias(planes) {
        const grid = document.createElement('div');
        grid.className = 'membership-grid';
        grid.innerHTML = planes.map(plan => `
            <div class="membership-card">
                <div class="membership-card-header"><h3>${plan.nombre}</h3></div>
                <div class="membership-card-body">
                    <p class="price">$${plan.precio.toFixed(2)}<span>/ ${plan.duracionDias} días</span></p>
                    <p class="description">${plan.descripcion || 'Sin descripción.'}</p>
                </div>
                <div class="membership-card-footer">
                    <button class="action-btn btn-edit" data-id="${plan.id}"><i class="material-icons">edit</i></button>
                    <button class="action-btn btn-delete" data-id="${plan.id}"><i class="material-icons">delete</i></button>
                </div>
            </div>
        `).join('');
        contentArea.appendChild(grid);
    }

    function displayMembresias(planesAnaliticas) {
    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'membership-center-wrapper'; // Para centrar el contenido
    
    const grid = document.createElement('div');
    grid.className = 'membership-grid';

    // Determinar permisos para mostrar botones
    const canEditOrDelete = userRoles.includes('ADMINISTRADOR') || userRoles.includes('EMPLEADO');
    
    grid.innerHTML = planesAnaliticas.map(plan => { 
        const totalClientes = plan.clientesActivos; // Dato REAL de la DB
        const actionButtons = canEditOrDelete ? `
            <div class="membership-card-footer">
                <button class="action-btn btn-edit" data-id="${plan.id}" title="Editar Plan"><i class="material-icons">edit</i></button>
                <button class="action-btn btn-delete" data-id="${plan.id}" title="Eliminar Plan"><i class="material-icons">delete</i></button>
            </div>
        ` : '';
        
        return `
            <div class="membership-card">
                <div class="membership-card-header"><h3>${plan.nombrePlan}</h3></div>
                <div class="membership-card-body">
                    <p class="price">$${plan.precio.toFixed(2)}<span> / ${plan.duracionDias} días</span></p>
                    <p class="description">${plan.descripcion || 'Sin descripción.'}</p>
                    
                    <div class="plan-analytics">
                        <div class="analytics-item">
                            <i class="material-icons">person</i>
                            <p><strong>${totalClientes}</strong> Clientes Activos</p>
                        </div>
                        <div class="analytics-item">
                            <i class="material-icons">gavel</i>
                            <p title="${plan.reglasAcceso || 'Sin reglas'}">Reglas: Ver Detalle</p>
                        </div>
                    </div>
                </div>
                ${actionButtons}
            </div>
        `;
    }).join('');
    
    gridWrapper.appendChild(grid);
    contentArea.appendChild(gridWrapper);
}

    // --- PAGOS SECTION LOGIC ---
    async function loadPagosSection() {
        contentArea.innerHTML = `
        <div class="pagos-container">
            <div class="pagos-sidebar card">
                <h3>Previsión de Vencimiento</h3>
                <div id="vencimientos-proximos">
                    <p>Cargando fechas...</p>
                </div>
                <button id="add-pago-btn" class="btn-accent full-width" style="margin-top: 1.5rem;">
                    <i class="material-icons">add</i> Registrar Pago
                </button>
            </div>
            <div class="pagos-main">
                <h2>Estado de Clientes (${new Date().toLocaleDateString('es-ES', { month: 'long' })})</h2>
                <div class="payment-client-grid" id="clientes-status-grid">
                    <p>Cargando estados...</p>
                </div>
            </div>
        </div>
    `;

        document.getElementById('add-pago-btn').addEventListener('click', showPagoRegistroModal);

        try {
            const response = await fetch(`${API_BASE_URL}/pagos/clientes-status`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            const clientesStatus = await response.json();

            displayPagos(clientesStatus);
            displayVencimientos(clientesStatus);
        } catch (error) {
            document.getElementById('clientes-status-grid').innerHTML = `<p>Error al cargar el estado de pagos: ${error.message}</p>`;
        }
    }

    function displayPagos(clientesStatus) {
        const grid = document.getElementById('clientes-status-grid');
        if (!grid) return;

        grid.innerHTML = clientesStatus.map(cliente => `
        <div class="payment-client-card status-${cliente.estadoPago}">
            <div class="card-header">
                <h3>${cliente.nombreCompleto}</h3>
                <span class="status-badge ${cliente.estadoPago}">${cliente.estadoPago}</span>
            </div>
            
            <div class="card-body">
                <p><strong>Código:</strong> ${cliente.codigoCliente}</p>
                <p><strong>Email:</strong> ${cliente.correo}</p>
                ${cliente.fechaVencimiento ? `<p><strong>Vencimiento:</strong> ${new Date(cliente.fechaVencimiento).toLocaleDateString()}</p>` : ''}
                ${cliente.montoPendiente && cliente.montoPendiente > 0 ? `<p class="monto-pendiente">Pendiente: <span>$${cliente.montoPendiente.toFixed(2)}</span></p>` : ''}
            </div>
            
            <div class="actions">
                <button class="action-btn btn-history" data-id="${cliente.id}" title="Ver Historial"><i class="material-icons">history</i></button>
                <button class="action-btn btn-register-payment" data-id="${cliente.id}" title="Registrar Pago"><i class="material-icons">receipt</i></button>
            </div>
        </div>
    `).join('');

        // Implementación placeholder para los botones
        grid.querySelectorAll('.btn-register-payment').forEach(btn => btn.addEventListener('click', (e) => showPagoRegistroModal(e.target.closest('button').dataset.id)));
        grid.querySelectorAll('.btn-history').forEach(btn => btn.addEventListener('click', (e) => showHistorialPagosModal(e.target.closest('button').dataset.id)));
    }

    // Implementación placeholder para el modal de registro de pago
    function showPagoRegistroModal(clienteId = null) {
    // Si se llama desde el botón FAB, clienteId es null, si se llama desde la tarjeta, viene el ID
    const isRegistrationFromCard = clienteId !== null;
    modalTitle.textContent = isRegistrationFromCard ? `Registrar Pago para Cliente ID ${clienteId}` : 'Registro de Pago General';
    
    // NOTA: Para un sistema real, necesitarías un endpoint que traiga el ID de membresía activa 
    // y el monto pendiente del clienteId, pero por ahora simplificamos la UI.
    
    modalBody.innerHTML = `
        <form id="registro-pago-form" class="modal-form">
            <h4 class="form-title">Detalles del Pago</h4>
            <div class="form-grid">
                ${isRegistrationFromCard ? 
                    `<input type="hidden" id="clienteId" value="${clienteId}">` : 
                    `<div class="form-group full-width"><label for="clienteId">ID de Cliente</label><input type="number" id="clienteId" class="input" required></div>`
                }
                
                <div class="form-group"><label for="membresiaId">ID de Membresía (Activa)</label><input type="number" id="membresiaId" class="input" placeholder="Ej: 1" required></div>
                
                <div class="form-group"><label for="monto">Monto Pagado ($)</label><input type="number" id="monto" class="input" step="0.01" required></div>
                
                <div class="form-group"><label for="metodo">Método de Pago</label>
                    <select id="metodo" class="input" required>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                </div>
            </div>

            <div class="modal-footer"><button type="submit" class="btn-accent">Confirmar Registro</button></div>
        </form>
    `;
    
    document.getElementById('registro-pago-form').addEventListener('submit', handlePagoFormSubmit);
    unifiedModal.style.display = 'flex';
}

async function handlePagoFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    // Recolección de datos
    const body = {
        clienteId: parseInt(form.elements.clienteId.value),
        membresiaId: parseInt(form.elements.membresiaId.value),
        monto: parseFloat(form.elements.monto.value),
        metodo: form.elements.metodo.value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/pagos`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify(body) 
        });

        if (!response.ok) { 
            const errorData = await response.text(); 
            throw new Error(errorData || `Error ${response.status}`); 
        }

        alert(`Pago de $${body.monto.toFixed(2)} registrado con éxito.`);
        closeModal();
        loadContent('pagos'); // Recargar la vista de estados
    } catch (error) { 
        alert(`Error al registrar el pago: ${error.message}`); 
    }
}
    // Implementación placeholder para el modal de historial
    async function showHistorialPagosModal(clienteId) {
    modalTitle.textContent = `Historial de Pagos del Cliente ID ${clienteId}`;
    modalBody.innerHTML = '<p>Cargando historial...</p>';
    unifiedModal.style.display = 'flex';

    try {
        // NOTA: NECESITAS UN ENDPOINT DE BACKEND: /api/pagos/cliente/{id}
        const response = await fetch(`${API_BASE_URL}/pagos?clienteId=${clienteId}`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });

        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const historial = await response.json(); // Asumimos que devuelve una lista de objetos Pago
        
        if (historial.length === 0) {
            modalBody.innerHTML = '<p>No se encontró historial de pagos para este cliente.</p>';
            return;
        }

        // Renderizar el historial en una tabla
        let tableHTML = `<table class="content-table">
                            <thead>
                                <tr><th>ID Pago</th><th>Monto</th><th>Método</th><th>Fecha Pago</th><th>Estado</th><th>Vencimiento</th></tr>
                            </thead>
                            <tbody>`;
        
        historial.forEach(pago => {
            const estadoClass = pago.estado === 'VENCIDO' || pago.estado === 'PENDIENTE' ? 'status-rojo' : 'status-verde';
            tableHTML += `<tr>
                            <td>${pago.id}</td>
                            <td>$${pago.montoPagado.toFixed(2)}</td>
                            <td>${pago.metodo || 'N/A'}</td>
                            <td>${new Date(pago.fechaPago).toLocaleDateString()}</td>
                            <td><span class="status-badge ${estadoClass}">${pago.estado}</span></td>
                            <td>${new Date(pago.fechaVencimiento).toLocaleDateString()}</td>
                          </tr>`;
        });

        tableHTML += `</tbody></table>`;
        modalBody.innerHTML = tableHTML;

    } catch (error) {
        modalBody.innerHTML = `<p class="error">Error al cargar el historial: ${error.message}. Asegúrate de tener el endpoint /api/pagos/cliente/{id} funcionando.</p>`;
    }
}

    // --- MODAL LOGIC (PERSONA UNIFICADA) ---
    function showPersonaModal(data = null, section = 'clientes') {
        const isEdit = data !== null;
        modalTitle.textContent = isEdit ? `Editar ${section.slice(0, -1)}` : 'Crear Persona Unificada';

        // Al crear, forzamos la sección a 'clientes' para usar los datos
        const currentSection = isEdit ? section : 'clientes';

        const persona = isEdit ? data.persona : {};

        // Si estamos editando un cliente/empleado, no debemos mostrar la selección de rol
        const showRoleSelector = !isEdit;

        // Obtener el rol actual para preselección en edición, aunque la edición es más compleja en el unified
        // Simplificamos la edición solo para los datos de Persona/Entidad principal.
        const currentRole = section.toUpperCase().replace(/S$/, '') || 'CLIENTE';

        modalBody.innerHTML = `
        <form id="persona-form" class="modal-form">
            <input type="hidden" id="editId" value="${isEdit ? data.id : ''}">
            <input type="hidden" id="personaId" value="${isEdit && persona ? persona.id : ''}">
            
            <h4 class="form-title">Datos Personales</h4>
            <div class="form-grid">
                <div class="form-group"><label for="nombre">Nombre</label><input type="text" id="nombre" class="input" value="${persona.nombre || ''}" required></div>
                <div class="form-group"><label for="apellido">Apellido</label><input type="text" id="apellido" class="input" value="${persona.apellido || ''}" required></div>
                <div class="form-group"><label for="correo">Correo Electrónico</label><input type="email" id="correo" class="input" value="${persona.correo || ''}" required></div>
                <div class="form-group"><label for="telefono">Teléfono Principal</label><input type="tel" id="telefono" class="input" value="${persona.telefono || ''}"></div>
                <div class="form-group"><label for="fechaNacimiento">F. Nacimiento</label><input type="date" id="fechaNacimiento" class="input" value="${persona.fechaNacimiento || ''}" required></div>
                <div class="form-group">
                    <label for="sexo">Sexo</label>
                    <select id="sexo" class="input">
                        <option value="">Selecciona</option>
                        <option value="M" ${persona.sexo === 'M' ? 'selected' : ''}>Masculino</option>
                        <option value="F" ${persona.sexo === 'F' ? 'selected' : ''}>Femenino</option>
                        <option value="O" ${persona.sexo === 'O' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group"><label for="estadoCivil">Estado Civil</label><input type="text" id="estadoCivil" class="input" value="${persona.estadoCivil || ''}"></div>
                <div class="form-group"><label for="telefonoEmergencia">Teléfono Emergencia</label><input type="tel" id="telefonoEmergencia" class="input" value="${persona.telefonoEmergencia || ''}"></div>
                <div class="form-group full-width"><label for="direccion">Dirección</label><input type="text" id="direccion" class="input" value="${persona.direccion || ''}"></div>
                <div class="form-group full-width"><label for="notas">Notas</label><textarea id="notas" class="input" rows="3">${persona.notas || ''}</textarea></div>
            </div>
            
            ${showRoleSelector ? `
                <h4 class="form-title">Tipo de Entidad y Acceso</h4>
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label for="role-selector">Rol a Asignar</label>
                        <select id="role-selector" class="input" required>
                            <option value="CLIENTE" selected>Cliente (Socio del Gimnasio)</option>
                            <option value="EMPLEADO">Empleado (Personal)</option>
                            <option value="ADMINISTRADOR">Administrador (Gestión Total)</option>
                        </select>
                    </div>
                </div>
                
                <div id="user-credentials-fields" style="display: none;">
                    <h4 class="form-title">Credenciales de Acceso</h4>
                    <p class="form-hint">Requiere credenciales para iniciar sesión.</p>
                    <div class="form-grid">
                        <div class="form-group"><label for="username">Nombre de Usuario</label><input type="text" id="username" class="input"></div>
                        <div class="form-group"><label for="password">Contraseña</label><input type="password" id="password" class="input"></div>
                    </div>
                </div>
            ` : ''}

            <div id="role-specific-fields">
                ${isEdit && currentSection === 'clientes' ?
                `<h4>Datos de Cliente</h4><div class="form-grid"><div class="form-group full-width"><label for="fechaInicio">Fecha de Inicio</label><input type="date" id="fechaInicio" class="input" value="${data.fechaInicio || new Date().toISOString().split('T')[0]}" required></div></div>`
                : isEdit && currentSection === 'empleados' ?
                    `<h4>Datos de Empleado</h4><div class="form-grid"><div class="form-group"><label for="salario">Salario</label><input type="number" id="salario" class="input" value="${data.salario || ''}" required></div><div class="form-group"><label for="fechaContratacion">Fecha de Contratación</label><input type="date" id="fechaContratacion" class="input" value="${data.fechaContratacion || new Date().toISOString().split('T')[0]}" required></div></div>`
                    : ''
            }
            </div>

            <div class="modal-footer"><button type="submit" class="btn-accent">${isEdit ? 'Guardar Cambios' : 'Crear Persona'}</button></div>
        </form>
    `;

        // Lógica para mostrar/ocultar campos en la creación
        if (showRoleSelector) {
            const roleSelector = document.getElementById('role-selector');
            roleSelector.addEventListener('change', updateSpecificFields);
            // Inicializar los campos específicos al abrir el modal (por defecto Cliente)
            updateSpecificFields();
        }

        // Listener para el formulario
        document.getElementById('persona-form').addEventListener('submit', (e) => handlePersonaFormSubmit(e, isEdit, currentSection));
        unifiedModal.style.display = 'flex';
    }

    function updateSpecificFields() {
        const role = document.getElementById('role-selector').value;
        const specificFields = document.getElementById('role-specific-fields');
        const userCredentials = document.getElementById('user-credentials-fields');

        let specificFieldsHTML = '';

        // Lógica para Credenciales de Usuario
        // Ahora, se requieren credenciales para CLIENTE, EMPLEADO y ADMINISTRADOR
        if (role === 'CLIENTE' || role === 'EMPLEADO' || role === 'ADMINISTRADOR') {
            // La sección de credenciales ya está en el HTML, solo la mostramos
            userCredentials.style.display = 'block';
            // Hacemos el username y password obligatorios
            document.getElementById('username').setAttribute('required', 'required');
            document.getElementById('password').setAttribute('required', 'required');
        } else {
            // En caso de que se agregue un rol sin login en el futuro
            userCredentials.style.display = 'none';
            document.getElementById('username').removeAttribute('required');
            document.getElementById('password').removeAttribute('required');
        }

        // Lógica para campos específicos del Rol (ESTA PARTE NO CAMBIA)
        if (role === 'CLIENTE') {
            specificFieldsHTML = `
            <h4 class="form-title">Datos de Cliente</h4>
            <div class="form-grid">
                <div class="form-group full-width">
                    <label for="fechaInicio">Fecha de Inicio</label>
                    <input type="date" id="fechaInicio" class="input" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
        `;
        } else if (role === 'EMPLEADO') {
            specificFieldsHTML = `
            <h4 class="form-title">Datos de Empleado</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="salario">Salario</label>
                    <input type="number" id="salario" class="input" required>
                </div>
                <div class="form-group">
                    <label for="fechaContratacion">Fecha de Contratación</label>
                    <input type="date" id="fechaContratacion" class="input" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
        `;
        }
        // ADMINISTRADOR no tiene campos específicos de entidad, solo los de Persona y Usuario.

        specificFields.innerHTML = specificFieldsHTML;
    }

    async function handlePersonaFormSubmit(e, isEdit, section) {
        e.preventDefault();
        const form = e.target;

        // 1. Recolección de Datos de Persona (Común a todos)
        const personaBody = {
            nombre: form.elements.nombre.value,
            apellido: form.elements.apellido.value,
            correo: form.elements.correo.value,
            telefono: form.elements.telefono.value,
            fechaNacimiento: form.elements.fechaNacimiento.value,

            // Nuevos campos
            sexo: form.elements.sexo ? form.elements.sexo.value : null,
            estadoCivil: form.elements.estadoCivil ? form.elements.estadoCivil.value : null,
            direccion: form.elements.direccion ? form.elements.direccion.value : null,
            telefonoEmergencia: form.elements.telefonoEmergencia ? form.elements.telefonoEmergencia.value : null,
            notas: form.elements.notas ? form.elements.notas.value : null,
        };

        // 2. Determinar Rol y Endpoint
        let rol = isEdit ? section.toUpperCase().replace(/S$/, '') : form.elements['role-selector'].value;
        let endpoint = isEdit ? section : 'personas/unified';
        let url = isEdit ? `${API_BASE_URL}/${endpoint}/${form.elements.editId.value}` : `${API_BASE_URL}/${endpoint}`;
        let method = isEdit ? 'PUT' : 'POST';

        // 3. Crear el DTO final (PersonaRequestDTO o el DTO de Edición)
        let finalBody;

        if (isEdit) {
            // Lógica simplificada de edición: Solo actualiza el Cliente/Empleado, asumiendo que ya existe la Persona
            // El backend debe manejar la actualización de la Persona anidada
            finalBody = {
                persona: {
                    id: form.elements.personaId.value,
                    ...personaBody // Incluir los datos de Persona
                }
            };

            if (section === 'clientes') {
                finalBody.fechaInicio = form.elements.fechaInicio.value;
            } else if (section === 'empleados') {
                finalBody.salario = parseFloat(form.elements.salario.value);
                finalBody.fechaContratacion = form.elements.fechaContratacion.value;
            }

        } else {
            // Lógica de Creación Unificada (usa PersonaRequestDTO)
            finalBody = {
                ...personaBody, // Datos de Persona
                rol: rol
            };

            // Agregar credenciales de Usuario (si existen en el formulario)
            if (form.elements.username && form.elements.username.value) {
                finalBody.username = form.elements.username.value;
                finalBody.password = form.elements.password.value;
            }

            // Agregar datos específicos del rol
            if (rol === 'CLIENTE') {
                finalBody.fechaInicio = form.elements.fechaInicio.value;
            } else if (rol === 'EMPLEADO') {
                finalBody.salario = parseFloat(form.elements.salario.value);
                finalBody.fechaContratacion = form.elements.fechaContratacion.value;
            }
        }


        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(finalBody)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || `Error ${response.status}`);
            }

            alert(`Persona ${isEdit ? 'actualizada' : 'creada'} con éxito como ${rol}.`);
            closeModal();
            loadContent(section); // Recargar la sección actual

        } catch (error) {
            alert(`Error al guardar: ${error.message}`);
        }
    }


    function showMembresiaModal(data = null) {
        const isEdit = data !== null;
        modalTitle.textContent = isEdit ? 'Editar Plan de Membresía' : 'Crear Nuevo Plan';
        modalBody.innerHTML = `
            <form id="membresia-form" class="modal-form">
                <input type="hidden" id="planId" value="${isEdit ? data.id : ''}">
                <div class="form-grid">
                    <div class="form-group full-width"><label for="nombre">Nombre del Plan</label><input type="text" id="nombre" class="input" value="${isEdit ? data.nombre : ''}" required></div>
                    <div class="form-group"><label for="precio">Precio</label><input type="number" id="precio" class="input" value="${isEdit ? data.precio : ''}" required></div>
                    <div class="form-group"><label for="duracion">Duración (días)</label><input type="number" id="duracion" class="input" value="${isEdit ? data.duracionDias : ''}" required></div>
                    <div class="form-group full-width"><label for="descripcion">Descripción</label><textarea id="descripcion" class="input" rows="3">${isEdit ? data.descripcion : ''}</textarea></div>
                </div>
                <div class="modal-footer"><button type="submit" class="btn-accent">${isEdit ? 'Guardar Cambios' : 'Crear Plan'}</button></div>
            </form>
        `;
        document.getElementById('membresia-form').addEventListener('submit', handleMembresiaFormSubmit);
        unifiedModal.style.display = 'flex';
    }

    async function handleMembresiaFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.elements.planId.value;
        const body = {
            nombre: form.elements.nombre.value,
            precio: parseFloat(form.elements.precio.value),
            duracionDias: parseInt(form.elements.duracion.value),
            descripcion: form.elements.descripcion.value,
            activo: true
        };
        const isEdit = id !== '';
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE_URL}/planes/${id}` : `${API_BASE_URL}/planes`;
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
            if (!response.ok) { const errorData = await response.text(); throw new Error(errorData || `Error ${response.status}`); }
            alert(`Plan ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
            closeModal();
            loadContent('membresias');
        } catch (error) { alert(`Error: ${error.message}`); }
    }

    // --- GENERAL MODAL & DELETE LOGIC ---
    function closeModal() { if (unifiedModal) unifiedModal.style.display = 'none'; }

    function mostrarModalEliminacion(id, nombre, section) {
        currentIdToDelete = id;
        currentSectionForDelete = section === 'membresias' ? 'planes' : section;
        deleteModalText.innerHTML = `¿Estás seguro de que quieres eliminar <strong>${nombre}</strong>?`;
        deleteModal.style.display = 'flex';
    }

    function cerrarModalEliminacion() { if (deleteModal) deleteModal.style.display = 'none'; }

    async function confirmarEliminacion() {
        if (currentIdToDelete && currentSectionForDelete) {
            try {
                const response = await fetch(`${API_BASE_URL}/${currentSectionForDelete}/${currentIdToDelete}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                if (!response.ok) { const errorData = await response.text(); throw new Error(errorData || `Error ${response.status}`); }
                alert(`Registro eliminado con éxito.`);
                loadContent(currentSectionForDelete === 'planes' ? 'membresias' : currentSectionForDelete);
            } catch (error) { alert(`Error: ${error.message}`); }
        }
        cerrarModalEliminacion();
    }

    // --- POS (VENTAS) SECTION LOGIC ---
    async function setupPOSInterface() {
        contentArea.innerHTML = `
            <div class="pos-container">
                <div class="product-grid-wrapper">
                    <div class="product-grid"></div>
                </div>
                <div class="cart-wrapper">
                    <h3>Carrito</h3>
                    <div class="cart-items"></div>
                    <div class="cart-summary">
                        <div class="total"><span>Total:</span><span id="cart-total">$0.00</span></div>
                        <button id="checkout-btn" class="btn-accent">Finalizar Compra</button>
                    </div>
                </div>
            </div>
        `;
        try {
            const products = await fetchProducts();
            productsCache = products; // Cache products
            renderProductGrid(products);
            document.getElementById('checkout-btn').addEventListener('click', handleCheckout);
        } catch (error) { contentArea.querySelector('.product-grid').innerHTML = "<p>Error al cargar productos.</p>"; }
    }

    async function fetchProducts() {
        const response = await fetch(`${API_BASE_URL}/productos`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('No se pudieron cargar los productos.');
        return await response.json();
    }

    function renderProductGrid(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<p>No se encontraron productos con los filtros aplicados.</p>';
        return;
    }

    // Check if the user has permission for editing/deleting (Admin or Empleado)
    const canEditOrDelete = userRoles.includes('ADMINISTRADOR') || userRoles.includes('EMPLEADO');
    
    grid.innerHTML = products.map(p => {
        const isAgotado = p.stockCantidad <= 0;
        const stockAlert = !isAgotado && p.stockCantidad <= p.stockMinimoAlerta;
        const stockClass = isAgotado ? 'stock-agotado' : (stockAlert ? 'stock-low' : 'stock-ok');
        
        const stockText = isAgotado ? 'Agotado' : `Stock: ${p.stockCantidad} ${p.tipoMedida || 'Und.'}`;
        
        const actionButtons = canEditOrDelete ? `
            <div class="product-actions">
                <button class="action-btn btn-edit" data-id="${p.id}" title="Editar Producto"><i class="material-icons">edit</i></button>
                <button class="action-btn btn-delete" data-id="${p.id}" title="Eliminar Producto"><i class="material-icons">delete</i></button>
            </div>
        ` : '';
        
        // Placeholder de imagen/icono basado en categoría
        let icon = 'local_shipping';
        if (p.categoria === 'SUPLEMENTO') icon = 'fitness_center';
        else if (p.categoria === 'BEBIDA') icon = 'local_drink';
        else if (p.categoria === 'SNACK') icon = 'fastfood';

        return `
            <div class="product-card market-view ${stockClass}">
                <div class="product-image">
                    <i class="material-icons product-icon">${icon}</i>
                </div>
                <div class="product-info">
                    <h4 title="${p.nombre}">${p.nombre}</h4>
                    <p class="category">${p.categoria || 'General'}</p>
                    <p class="stock-info"><span>${stockText}</span></p>
                    <p class="product-price">$${p.precioVenta.toFixed(2)}</p>
                </div>
                ${actionButtons}
            </div>
        `;
    }).join('');
}

    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.cantidad++;
        } else {
            cart.push({ ...product, cantidad: 1 });
        }
        updateCartDisplay();
    }

    function updateCartDisplay() {
        const cartItemsContainer = contentArea.querySelector('.cart-items');
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>El carrito está vacío.</p>';
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <h5>${item.nombre}</h5>
                        <div class="quantity-controls">
                            <button data-id="${item.id}" class="quantity-decrease">-</button>
                            <span>${item.cantidad}</span>
                            <button data-id="${item.id}" class="quantity-increase">+</button>
                        </div>
                    </div>
                    <span>$${(item.precioVenta * item.cantidad).toFixed(2)}</span>
                </div>
            `).join('');
        }
        const total = cart.reduce((sum, item) => sum + (item.precioVenta * item.cantidad), 0);
        contentArea.querySelector('#cart-total').textContent = `$${total.toFixed(2)}`;
        // Add event listeners for quantity controls
        cartItemsContainer.querySelectorAll('.quantity-decrease').forEach(b => b.addEventListener('click', () => updateQuantity(b.dataset.id, -1)));
        cartItemsContainer.querySelectorAll('.quantity-increase').forEach(b => b.addEventListener('click', () => updateQuantity(b.dataset.id, 1)));
    }

    function updateQuantity(productId, change) {
        const item = cart.find(i => i.id == productId);
        if (!item) return;
        item.cantidad += change;
        if (item.cantidad <= 0) {
            cart = cart.filter(i => i.id != productId);
        }
        updateCartDisplay();
    }

    async function handleCheckout() {
        if (cart.length === 0) {
            alert('El carrito está vacío.');
            return;
        }
        // En una app real, pediríamos seleccionar un cliente.
        // Por ahora, usaremos un ID de cliente fijo (ej: 1) para la demo.
        const clienteId = 1;
        const total = cart.reduce((sum, item) => sum + (item.precioVenta * item.cantidad), 0);
        const productosIds = cart.flatMap(item => Array(item.cantidad).fill(item.id));

        const ventaRequest = { clienteId, productosIds, total };

        try {
            const response = await fetch(`${API_BASE_URL}/ventas`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(ventaRequest) });
            if (!response.ok) { const errorData = await response.text(); throw new Error(errorData || `Error ${response.status}`); }
            alert('Venta realizada con éxito!');
            cart = [];
            updateCartDisplay();
        } catch (error) { alert(`Error al finalizar la venta: ${error.message}`); }
    }
});