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
    const API_BASE_URL = 'http://localhost:8080/api';
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
        } else if (section === 'pagos') {
            // showPagoModal(); // Si se necesita un modal para crear pagos
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
            } else if (section === 'pagos') {
                alert('Funcionalidad de edición de pagos no implementada aún.');
            }
        } catch (error) { alert(`Error al cargar datos para edición: ${error.message}`); }
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
        } else {
            const endpoint = section === 'membresias' ? 'planes' : section;
            try {
                const response = await fetch(`${API_BASE_URL}/${endpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!response.ok) throw new Error(`Error: ${response.status}`);
                displayData(await response.json(), section);
            } catch (error) { contentArea.innerHTML = `<p>Error al cargar los datos de ${section}: ${error.message}</p>`; }
        }
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

    // --- PAGOS SECTION LOGIC ---
    async function loadPagosSection() {
        try {
            const response = await fetch(`${API_BASE_URL}/pagos/clientes-status`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            displayPagos(await response.json());
        } catch (error) { contentArea.innerHTML = `<p>Error al cargar el estado de pagos: ${error.message}</p>`; }
    }

    function displayPagos(clientesStatus) {
        const grid = document.createElement('div');
        grid.className = 'payment-client-grid';
        grid.innerHTML = clientesStatus.map(cliente => `
            <div class="payment-client-card status-${cliente.estadoPago}">
                <h3>${cliente.nombreCompleto}</h3>
                <p><strong>Código:</strong> ${cliente.codigoCliente}</p>
                <p><strong>Email:</strong> ${cliente.correo}</p>
                <p><strong>Estado:</strong> <span class="status-badge ${cliente.estadoPago}">${cliente.estadoPago}</span></p>
                ${cliente.fechaVencimiento ? `<p><strong>Vencimiento:</strong> ${cliente.fechaVencimiento}</p>` : ''}
                ${cliente.montoPendiente && cliente.montoPendiente > 0 ? `<p><strong>Monto Pendiente:</strong> $${cliente.montoPendiente.toFixed(2)}</p>` : ''}
                <div class="actions">
                    <button class="action-btn btn-edit" data-id="${cliente.id}"><i class="material-icons">visibility</i></button>
                    <!-- Botón para registrar pago, si se implementa -->
                </div>
            </div>
        `).join('');
        contentArea.appendChild(grid);
    }

    // --- MODAL LOGIC (PERSONA) ---
    function showPersonaModal(data = null, section = 'clientes') {
        const isEdit = data !== null;
        modalTitle.textContent = isEdit ? `Editar ${section.slice(0, -1)}` : 'Crear Persona';
        const persona = isEdit ? data.persona : {};
        modalBody.innerHTML = `
            <form id="persona-form" class="modal-form">
                <input type="hidden" id="editId" value="${isEdit ? data.id : ''}">
                <input type="hidden" id="personaId" value="${isEdit && persona ? persona.id : ''}">
                <h4>Datos Personales</h4>
                <div class="form-grid">
                    <div class="form-group"><label for="nombre">Nombre</label><input type="text" id="nombre" class="input" value="${persona.nombre || ''}" required></div>
                    <div class="form-group"><label for="apellido">Apellido</label><input type="text" id="apellido" class="input" value="${persona.apellido || ''}" required></div>
                    <div class="form-group"><label for="correo">Correo</label><input type="email" id="correo" class="input" value="${persona.correo || ''}" required></div>
                    <div class="form-group"><label for="telefono">Teléfono</label><input type="tel" id="telefono" class="input" value="${persona.telefono || ''}"></div>
                    <div class="form-group full-width"><label for="fechaNacimiento">Fecha de Nacimiento</label><input type="date" id="fechaNacimiento" class="input" value="${persona.fechaNacimiento || ''}" required></div>
                </div>
                <div id="role-specific-fields"></div>
                <div class="modal-footer"><button type="submit" class="btn-accent">${isEdit ? 'Guardar Cambios' : 'Crear'}</button></div>
            </form>
        `;
        const roleSpecificFields = document.getElementById('role-specific-fields');
        let specificFieldsHTML = '';
        if (section === 'clientes') {
            specificFieldsHTML = `<h4>Datos de Cliente</h4><div class="form-grid"><div class="form-group full-width"><label for="fechaInicio">Fecha de Inicio</label><input type="date" id="fechaInicio" class="input" value="${isEdit ? data.fechaInicio : new Date().toISOString().split('T')[0]}" required></div></div>`;
        } else if (section === 'empleados') {
            specificFieldsHTML = `<h4>Datos de Empleado</h4><div class="form-grid"><div class="form-group"><label for="salario">Salario</label><input type="number" id="salario" class="input" value="${isEdit ? data.salario : ''}" required></div><div class="form-group"><label for="fechaContratacion">Fecha de Contratación</label><input type="date" id="fechaContratacion" class="input" value="${isEdit ? data.fechaContratacion : new Date().toISOString().split('T')[0]}" required></div></div>`;
        }
        roleSpecificFields.innerHTML = specificFieldsHTML;
        document.getElementById('persona-form').addEventListener('submit', (e) => handlePersonaFormSubmit(e, isEdit, section));
        unifiedModal.style.display = 'flex';
    }

    async function handlePersonaFormSubmit(e, isEdit, section) {
        e.preventDefault();
        const form = e.target;
        const id = form.elements.editId.value;
        const personaId = form.elements.personaId.value;
        const persona = { id: personaId ? parseInt(personaId) : null, nombre: form.elements.nombre.value, apellido: form.elements.apellido.value, correo: form.elements.correo.value, telefono: form.elements.telefono.value, fechaNacimiento: form.elements.fechaNacimiento.value };
        let body = { persona, activo: true };
        if (section === 'clientes') {
            body.fechaInicio = form.elements.fechaInicio.value;
        } else if (section === 'empleados') {
            body.salario = parseFloat(form.elements.salario.value);
            body.fechaContratacion = form.elements.fechaContratacion.value;
        }
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE_URL}/${section}/${id}` : `${API_BASE_URL}/${section}`;
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
            if (!response.ok) { const errorData = await response.text(); throw new Error(errorData || `Error ${response.status}`); }
            alert(`${section.slice(0, -1)} ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
            closeModal();
            loadContent(section);
        } catch (error) { alert(`Error: ${error.message}`); }
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
        const grid = contentArea.querySelector('.product-grid');
        grid.innerHTML = products.map(p => `
            <div class="product-card" data-id="${p.id}">
                <h4>${p.nombre}</h4>
                <p class="product-price">$${p.precioVenta.toFixed(2)}</p>
            </div>
        `).join('');
        grid.querySelectorAll('.product-card').forEach(card => card.addEventListener('click', () => addToCart(productsCache.find(p => p.id == card.dataset.id))));
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