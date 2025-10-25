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
    loadContent('clientes'); // Carga inicial

    // --- INITIALIZERS ---
    function initializeUI() {
        usernameDisplay.textContent = username || 'Usuario'; // Mostrar 'Usuario' si no hay nombre
        // Ocultar el FAB si el rol no tiene permiso para crear
        // Solo Admin puede crear entidades principales
        if (!userRoles.includes('ADMINISTRADOR')) {
             if (fab) fab.style.display = 'none';
        }
    }

    function initializeEventListeners() {
        if(themeToggleButton) themeToggleButton.addEventListener('click', () => typeof toggleTheme === 'function' && toggleTheme());
        if(logoutButton) logoutButton.addEventListener('click', (e) => { e.preventDefault(); sessionStorage.clear(); window.location.href = 'index.html'; });
        navLinks.forEach(link => link.addEventListener('click', handleNavClick));
        if (fab) fab.addEventListener('click', handleFabClick);
        // Modals
        if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if(unifiedModal) unifiedModal.addEventListener('click', e => { if (e.target === unifiedModal) closeModal(); });
        if (deleteModal) deleteModal.addEventListener('click', e => { if (e.target === deleteModal) cerrarModalEliminacion(); });
         // Corregido: Referencia al botón de cerrar del modal de eliminación
         const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
         if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', cerrarModalEliminacion);
        if (cancelDeleteButton) cancelDeleteButton.addEventListener('click', cerrarModalEliminacion);
        if (confirmDeleteButton) confirmDeleteButton.addEventListener('click', confirmarEliminacion);
        // Content Area Delegation
        if(contentArea) contentArea.addEventListener('click', handleContentAreaClick);
    }

    // --- EVENT HANDLERS ---
    function handleNavClick(e) {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        const section = this.dataset.section;
        console.log(`Navegando a la sección: ${section}`); // Log de depuración
        loadContent(section);
    }

    function handleFabClick() {
        const sectionLink = document.querySelector('.sidebar-nav a.active');
        if (!sectionLink) return; // Salir si no hay sección activa
        const section = sectionLink.dataset.section;

        console.log(`FAB clickeado en sección: ${section}`); // Log

        // Solo permitir crear desde FAB si eres ADMIN
        if (!userRoles.includes('ADMINISTRADOR')) {
             alert('No tienes permiso para crear.');
             return;
        }

        // El modal unificado maneja la creación de Cliente, Empleado y Admin
        if (section === 'clientes' || section === 'empleados' || section === 'administradores') {
            showPersonaModal(null, section); // Pasar la sección actual
        } else if (section === 'membresias') {
            showMembresiaModal();
        } else if (section === 'productos') {
            showProductModal();
        } else if (section === 'pagos') {
            // Ya no se usa FAB para pagos, el botón está en la sección
             console.warn("FAB clickeado en Pagos, pero el botón está dentro de la sección.");
            // showPagoRegistroModal(); // Podría llamarse, pero es redundante
        } else {
             console.warn(`Sección desconocida para FAB: ${section}`);
        }
    }

    async function handleContentAreaClick(e) {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');
        const productCardForCart = e.target.closest('.product-card.pos-view'); // Específico para añadir al carrito
        const productCardForAdmin = e.target.closest('.product-card.market-view'); // Específico para la vista de admin

        const sectionLink = document.querySelector('.sidebar-nav a.active');
        if (!sectionLink) return;
        const section = sectionLink.dataset.section;

        if (editBtn) {
            const id = editBtn.dataset.id;
             console.log(`Botón Editar presionado: ID=${id}, Sección=${section}`); // Log
            handleEdit(id, section);
        } else if (deleteBtn) {
            const id = deleteBtn.dataset.id;
             console.log(`Botón Eliminar presionado: ID=${id}, Sección=${section}`); // Log
            let name = 'elemento'; // Default name

            // Intentar obtener un nombre más descriptivo
            const card = deleteBtn.closest('.membership-card') || deleteBtn.closest('.payment-client-card') || deleteBtn.closest('.product-card');
            const tableRow = deleteBtn.closest('tr');

            if (card) {
                name = card.querySelector('h3, h4')?.textContent || `ID ${id}`; // Buscar h3 o h4
            } else if (tableRow) {
                 const nameCell = tableRow.querySelector('td:nth-child(2)'); // Nombre suele estar en la 2da celda
                 name = nameCell?.textContent || `ID ${id}`;
                 if (!nameCell?.textContent && section === 'administradores') {
                      const usernameCell = tableRow.querySelector('td:nth-child(4)'); // Username es 4ta celda en tabla admin
                      name = usernameCell?.textContent || `ID ${id}`;
                 }
            } else {
                 name = `ID ${id}`; // Fallback
            }

             console.log(`Mostrando modal de eliminación para: ${name}`); // Log
            mostrarModalEliminacion(id, name, section);

        } else if (productCardForCart && section === 'ventas') { // Añadir al carrito desde POS
             const id = productCardForCart.dataset.id;
             const product = productsCache.find(p => p.id == id);
             if (product && product.stockCantidad > 0) {
                  console.log(`Añadiendo al carrito: ${product.nombre}`); // Log
                  addToCart(product);
             } else if (product) {
                  alert(`"${product.nombre}" está agotado.`);
             }
        }
        // No hacer nada si se clickea en productCardForAdmin (la vista de admin no añade al carrito)
    }


    // Nueva función para llenar la barra lateral de vencimientos (si existe)
    function displayVencimientos(clientesStatus) {
        const container = document.getElementById('vencimientos-proximos');
        if (!container) return; // Salir si el elemento no existe en la sección actual
        console.log("Actualizando sección de vencimientos..."); // Log

        const warningClients = clientesStatus.filter(c => c.estadoPago === 'AMARILLO' || c.estadoPago === 'ROJO');

        if (warningClients.length === 0) {
            container.innerHTML = '<p class="status-verde">¡Todos los clientes están al día!</p>';
            return;
        }

        container.innerHTML = warningClients.map(c => {
            const dateText = c.fechaVencimiento ? new Date(c.fechaVencimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'N/A';
            return `
            <div class="vencimiento-item status-${c.estadoPago.toLowerCase()}">
                <span>${c.nombreCompleto}</span>
                <span class="vencimiento-date">${dateText}</span>
            </div>
            `;
        }).join('');
    }

    async function handleEdit(id, section) {
        // Verificar permisos
        if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('EMPLEADO')) {
             alert('No tienes permiso para editar.');
             return;
        }

        let endpoint;
        if (section === 'membresias') endpoint = 'planes';
        else if (section === 'administradores') endpoint = 'usuarios';
        else endpoint = section; // clientes, empleados, productos

        console.log(`Iniciando edición para ID ${id} en endpoint ${endpoint}`); // Log

        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            console.log(`Respuesta fetch para editar ${endpoint}/${id}: Status ${response.status}`); // Log status

            if (!response.ok) {
                 const errorText = await response.text();
                 console.error(`Error ${response.status} al cargar datos para editar ${endpoint}/${id}: ${errorText}`); // Log error detallado
                 throw new Error(`Error ${response.status}: ${errorText || 'No se pudo cargar la información'}`);
            }

            const data = await response.json();
             console.log(`Datos recibidos para editar (${endpoint}/${id}):`, data); // Log datos recibidos

            // Abrir el modal correspondiente
            if (section === 'clientes' || section === 'empleados' || section === 'administradores') {
                showPersonaModal(data, section);
            } else if (section === 'membresias') {
                showMembresiaModal(data);
            } else if (section === 'productos') {
                showProductModal(data);
            } else if (section === 'pagos') {
                alert('Funcionalidad de edición de pagos no implementada aún.');
            }
        } catch (error) {
             console.error(`Error en handleEdit (${section}, ${id}):`, error);
             // Mostrar mensaje más descriptivo al usuario
             let userMessage = `Error al cargar datos para edición.`;
             if (error.message.includes("403")) {
                  userMessage += " Parece que no tienes permiso para acceder a esta información.";
             } else if (error.message.includes("404")) {
                  userMessage += " El registro no fue encontrado.";
             } else {
                  userMessage += " Intenta de nuevo más tarde.";
             }
             alert(`${userMessage} (Detalles en consola)`);
        }
    }

    function showProductModal(data = null) {
        const isEdit = data !== null;
        modalTitle.textContent = isEdit ? `Editar Producto: ${data.nombre}` : 'Crear Nuevo Producto';
         console.log(isEdit ? `Abriendo modal para editar producto ID ${data.id}` : "Abriendo modal para crear producto"); // Log

        const defaults = {
            id: null, nombre: '', categoria: 'SUPLEMENTO', tipoMedida: 'UNIDAD', scoopsPorEnvase: null,
            precioVenta: '', stockCantidad: '', stockMinimoAlerta: 0, activo: true,
            ...(isEdit ? data : {}) // Sobrescribir defaults con data si es edición
        };

        // Convertir null a string vacío para inputs numéricos opcionales
        const scoopsValue = defaults.scoopsPorEnvase !== null ? defaults.scoopsPorEnvase : '';


        // Solo Admin o Empleado pueden crear/editar
        if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('EMPLEADO')) {
            alert("No tienes permisos para crear/editar productos.");
            return;
        }

        modalBody.innerHTML = `
        <form id="product-form" class="modal-form">
            <input type="hidden" id="productId" value="${defaults.id || ''}">
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
                <div class="form-group"><label for="precioVenta">Precio Venta (Q)</label><input type="number" id="precioVenta" class="input" value="${defaults.precioVenta}" step="0.01" min="0" required></div>
            </div>
            <h4 class="form-title">Inventario y Medidas</h4>
            <div class="form-grid">
                <div class="form-group"><label for="stockCantidad">Stock Actual</label><input type="number" id="stockCantidad" class="input" value="${defaults.stockCantidad}" min="0" required></div>
                <div class="form-group"><label for="stockMinimoAlerta">Stock Mínimo Alerta</label><input type="number" id="stockMinimoAlerta" class="input" value="${defaults.stockMinimoAlerta}" min="0"></div>
                <div class="form-group"><label for="tipoMedida">Tipo Medida</label>
                    <select id="tipoMedida" class="input">
                        <option value="UNIDAD" ${defaults.tipoMedida === 'UNIDAD' ? 'selected' : ''}>Unidad (Botella, Barra)</option>
                        <option value="ENVASE" ${defaults.tipoMedida === 'ENVASE' ? 'selected' : ''}>Envase (Proteína)</option>
                        <option value="SCOOP" ${defaults.tipoMedida === 'SCOOP' ? 'selected' : ''}>Scoop/Porción</option>
                    </select>
                </div>
                <div class="form-group"><label for="scoopsPorEnvase">Scoops/Porciones (si Envase)</label><input type="number" id="scoopsPorEnvase" class="input" value="${scoopsValue}" min="0" placeholder="Opcional"></div>
            </div>
            <div class="form-group full-width" style="margin-top: 1rem;">
                <label><input type="checkbox" id="activo" ${defaults.activo ? 'checked' : ''}> Producto Activo (Disponible)</label>
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
         console.log(isEdit ? `Guardando cambios para producto ID ${id}` : "Creando nuevo producto"); // Log

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

        // Validación básica
         if (!body.nombre) { alert("El nombre del producto es obligatorio."); return; }
         if (isNaN(body.precioVenta) || body.precioVenta < 0) { alert("El precio de venta debe ser un número positivo."); return; }
         if (isNaN(body.stockCantidad) || body.stockCantidad < 0) { alert("El stock actual debe ser un número positivo."); return; }
         if (body.scoopsPorEnvase !== null && (isNaN(body.scoopsPorEnvase) || body.scoopsPorEnvase < 0)) {
              alert("Scoops/Porciones debe ser un número positivo si se ingresa."); return;
         }


        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE_URL}/productos/${id}` : `${API_BASE_URL}/productos`;
         console.log(`Enviando ${method} a ${url} con body:`, body); // Log

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
             console.log(`Respuesta ${method} ${url}: Status ${response.status}`); // Log status

            if (!response.ok) {
                const errorText = await response.text();
                 console.error(`Error ${response.status} al guardar producto: ${errorText}`); // Log error
                throw new Error(errorText || `Error ${response.status}`);
            }

            alert(`Producto ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
            closeModal();
            loadContent('productos'); // Recargar la sección de productos
        } catch (error) {
             console.error(`Error al guardar producto: `, error);
            alert(`Error al guardar el producto: ${error.message}`);
        }
    }
    // --- CORE LOGIC ---
    async function loadContent(section) {
        console.log(`Iniciando carga de contenido para: ${section}`); // Log
        // Ajustar título visible
         let titleText = section.charAt(0).toUpperCase() + section.slice(1);
         if (section === 'membresias') titleText = 'Planes de Membresía';
         if (section === 'productos') titleText = 'Gestión de Inventario';
         if (section === 'ventas') titleText = 'Punto de Venta (POS)';
         if (section === 'pagos') titleText = 'Gestión de Pagos';
         if (section === 'administradores') titleText = 'Gestión de Administradores';
        sectionTitle.textContent = titleText;

        contentArea.innerHTML = '<div class="loading-spinner"></div>'; // Indicador de carga
        // Mostrar FAB solo si es ADMIN y NO está en Ventas o Pagos
        fab.style.display = (userRoles.includes('ADMINISTRADOR') && section !== 'ventas' && section !== 'pagos') ? 'block' : 'none';

        try {
             if (section === 'ventas') {
                  await setupPOSInterface();
             } else if (section === 'pagos') {
                  await loadPagosSection();
             } else if (section === 'productos') {
                  await setupProductMarket(); // Carga la vista de gestión de inventario
             } else if (section === 'membresias') {
                  const response = await fetch(`${API_BASE_URL}/planes/analiticas`, { headers: { 'Authorization': `Bearer ${token}` } });
                  if (!response.ok) throw new Error(`Error ${response.status}: No se pudo cargar análisis de planes.`);
                  displayMembresias(await response.json());
             } else if (section === 'administradores') {
                 await loadAdministradores();
             } else { // Clientes o Empleados
                  const endpoint = section;
                  const response = await fetch(`${API_BASE_URL}/${endpoint}`, { headers: { 'Authorization': `Bearer ${token}` } });
                  if (!response.ok) throw new Error(`Error ${response.status}: No se pudo cargar la lista de ${endpoint}.`);
                  displayTable(await response.json(), section);
             }
             console.log(`Contenido cargado exitosamente para: ${section}`); // Log éxito
        } catch (error) {
             console.error(`Error al cargar la sección ${section}:`, error);
             let userMessage = `Error al cargar los datos de ${titleText}.`;
             if (error.message.includes("403")) {
                  userMessage += " Parece que no tienes permiso.";
             } else if (error.message.includes("Failed to fetch")) {
                   userMessage += " No se pudo conectar con el servidor.";
             } else {
                  userMessage += " Intenta de nuevo más tarde.";
             }
             contentArea.innerHTML = `<p class="error">${userMessage} (Revisa la consola para detalles técnicos)</p>`;
        }
    }

     // Cargar Administradores
     async function loadAdministradores() {
          console.log("Cargando administradores..."); // Log
          try {
               const response = await fetch(`${API_BASE_URL}/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } });
               console.log(`Respuesta fetch /usuarios: Status ${response.status}`); // Log status

               if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Error ${response.status} al cargar usuarios: ${errorText}`); // Log error
                    throw new Error(`Error ${response.status}: ${errorText || 'No se pudo cargar la lista de usuarios.'}`);
               }

               const usuarios = await response.json();
                console.log("Usuarios recibidos:", usuarios); // Log datos

               // Filtrar por rol 'ADMINISTRADOR'
               const administradores = usuarios.filter(user =>
                    Array.isArray(user.roles) && user.roles.some(rol => rol && rol.nombre === 'ADMINISTRADOR')
               );
                console.log("Administradores filtrados:", administradores); // Log filtrados

               displayAdministradoresTable(administradores);
          } catch (error) {
               console.error("Error en loadAdministradores:", error); // Log error específico
               contentArea.innerHTML = `<p class="error">Error al cargar administradores: ${error.message}</p>`;
          }
     }

     // Mostrar Tabla de Administradores
     function displayAdministradoresTable(admins) {
          contentArea.innerHTML = ''; // Limpiar área

          if (!admins || admins.length === 0) {
               contentArea.innerHTML = '<p>No hay administradores registrados.</p>';
               return;
          }

          const table = document.createElement('table');
          table.className = 'content-table';

          const canEditOrDelete = userRoles.includes('ADMINISTRADOR');

          let headers = ['ID', 'Nombre', 'Email', 'Username', 'Activo', 'Acciones'];
          if (!canEditOrDelete) headers = headers.filter(h => h !== 'Acciones');

          const rows = admins.map(admin => {
               const persona = admin.persona || {};
               const activeStatus = admin.activo ? 'Activo' : 'Inactivo';
               const statusClass = admin.activo ? 'status-activo' : 'status-inactivo';

               const cells = `
                    <td>${admin.id}</td>
                    <td>${persona.nombre || ''} ${persona.apellido || ''}</td>
                    <td>${persona.correo || 'N/A'}</td>
                    <td>${admin.username || 'N/A'}</td>
                    <td><span class="status-badge ${statusClass}">${activeStatus}</span></td>
               `;

               let actionCells = '';
               if (canEditOrDelete) {
                    actionCells = `
                         <td class="action-cell">
                              <button class="action-btn btn-edit" data-id="${admin.id}" title="Editar"><i class="material-icons">edit</i></button>
                              <button class="action-btn btn-delete" data-id="${admin.id}" title="Eliminar"><i class="material-icons">delete</i></button>
                         </td>
                    `;
               }

               return `<tr>${cells}${actionCells}</tr>`;
          }).join('');

          table.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
          contentArea.appendChild(table);
           console.log("Tabla de administradores renderizada."); // Log
     }


    async function setupProductMarket() {
         console.log("Configurando vista de gestión de inventario (Market)..."); // Log
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
                             <option value="DISPONIBLE">Disponible (> 0)</option>
                            <option value="ALERTA">En Alerta (Stock Bajo)</option>
                            <option value="AGOTADO">Agotado (Stock 0)</option>
                        </select>
                    </div>
                     <div class="form-group full-width">
                         <label for="status-filter">Estado</label>
                         <select id="status-filter" class="input">
                             <option value="">Todos</option>
                             <option value="ACTIVO">Activo</option>
                             <option value="INACTIVO">Inactivo</option>
                         </select>
                     </div>
                </div>
            </div>
            <div class="market-main">
                <div class="market-grid-header">
                    <h2>Inventario</h2>
                    <span id="product-count"></span> <!-- Para mostrar contador -->
                </div>
                <div id="product-grid" class="market-grid">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        </div>
        `;

        try {
            const response = await fetch(`${API_BASE_URL}/productos`, { headers: { 'Authorization': `Bearer ${token}` } });
             console.log(`Respuesta fetch /productos: Status ${response.status}`); // Log
            if (!response.ok) {
                 const errorText = await response.text();
                 console.error(`Error ${response.status} al cargar productos: ${errorText}`); // Log error
                 throw new Error(`Error ${response.status}: ${errorText || 'No se pudo cargar el inventario.'}`);
            }
            const products = await response.json();
             console.log(`Productos recibidos (${products.length}):`, products); // Log data
            productsCache = products; // Guardar en caché

            // Inicializar listeners para filtros
            document.getElementById('search-input').addEventListener('input', applyFilters);
            document.getElementById('category-filter').addEventListener('change', applyFilters);
            document.getElementById('stock-filter').addEventListener('change', applyFilters);
             document.getElementById('status-filter').addEventListener('change', applyFilters); // Listener para nuevo filtro

            applyFilters(); // Aplicar filtros iniciales (mostrar todo)
             console.log("Vista de inventario configurada."); // Log
        } catch (error) {
             console.error("Error en setupProductMarket:", error);
            const grid = document.getElementById('product-grid');
             if(grid) grid.innerHTML = `<p class="error">Error al cargar el inventario: ${error.message}</p>`;
        }
    }

    function applyFilters() {
         console.log("Aplicando filtros de productos..."); // Log
        const search = document.getElementById('search-input')?.value.toLowerCase() || '';
        const category = document.getElementById('category-filter')?.value || '';
        const stockFilter = document.getElementById('stock-filter')?.value || '';
         const statusFilter = document.getElementById('status-filter')?.value || ''; // Nuevo filtro
        const grid = document.getElementById('product-grid');
         const countSpan = document.getElementById('product-count');

         if(!grid) {
              console.error("Elemento #product-grid no encontrado al aplicar filtros.");
              return; // Salir si el grid no existe
         }

        const filteredProducts = productsCache.filter(p => {
             // Asegurarse de que p existe y tiene las propiedades necesarias
             if (!p || typeof p.nombre !== 'string') return false;

            // Filtro de búsqueda
            const nameMatch = p.nombre.toLowerCase().includes(search) || (p.categoria && p.categoria.toLowerCase().includes(search));
            // Filtro de categoría
            const categoryMatch = !category || p.categoria === category;
            // Filtro de Stock
            let stockMatch = true;
            if (stockFilter === 'DISPONIBLE') {
                 stockMatch = p.stockCantidad > 0;
            } else if (stockFilter === 'ALERTA') {
                 // Considerar stockMinimoAlerta 0 o null como sin alerta definida
                 const minStock = p.stockMinimoAlerta || 0;
                 stockMatch = p.stockCantidad > 0 && minStock > 0 && p.stockCantidad <= minStock;
            } else if (stockFilter === 'AGOTADO') {
                stockMatch = p.stockCantidad <= 0;
            }
             // Filtro de Estado (Activo/Inactivo)
             let statusMatch = true;
             if (statusFilter === 'ACTIVO') {
                  statusMatch = p.activo === true;
             } else if (statusFilter === 'INACTIVO') {
                  statusMatch = p.activo === false;
             }


            return nameMatch && categoryMatch && stockMatch && statusMatch;
        });

         console.log(`Productos filtrados: ${filteredProducts.length}`); // Log count
         if(countSpan) countSpan.textContent = `(${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'})`; // Actualizar contador

        renderProductGrid(filteredProducts); // Renderizar con los productos filtrados
    }

    // --- DISPLAY FUNCTIONS ---

    function displayTable(data, section) {
        contentArea.innerHTML = ''; // Limpiar área
        console.log(`Renderizando tabla para ${section} con ${data?.length || 0} items.`); // Log

        if (!data || data.length === 0) {
             contentArea.innerHTML = `<p>No hay ${section} para mostrar.</p>`;
             return;
        }

        const table = document.createElement('table');
        table.className = 'content-table';

        const canEditOrDelete = userRoles.includes('ADMINISTRADOR') || userRoles.includes('EMPLEADO');

        let headers = [];
        if (section === 'clientes') {
            headers = ['ID', 'Nombre', 'Email', 'Código', 'Activo', 'Acciones'];
            if (!canEditOrDelete) headers = headers.filter(h => h !== 'Acciones');
        } else { // Empleados
            headers = ['ID', 'Nombre', 'Email', 'Salario', 'Contratación', 'Activo', 'Acciones'];
            if (!canEditOrDelete) headers = headers.filter(h => h !== 'Acciones');
        }

        const rows = data.map(item => {
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
                 const salarioFormatted = item.salario != null ? `Q${Number(item.salario).toFixed(2)}` : 'N/A'; // Asegurar que sea número
                 const fechaContratacionFormatted = item.fechaContratacion ? new Date(item.fechaContratacion).toLocaleDateString('es-GT') : 'N/A';
                 specificCells = `
                     <td>${salarioFormatted}</td>
                     <td>${fechaContratacionFormatted}</td>
                     <td><span class="status-badge ${statusClass}">${activeStatus}</span></td>
                 `;
            }

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
         console.log(`Tabla para ${section} renderizada.`); // Log
    }

    function displayMembresias(planesAnaliticas) {
         contentArea.innerHTML = ''; // Limpiar
          console.log(`Renderizando membresías con ${planesAnaliticas?.length || 0} planes.`); // Log

         if (!planesAnaliticas || planesAnaliticas.length === 0) {
              contentArea.innerHTML = '<p>No hay planes de membresía definidos.</p>';
              return;
         }

        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'membership-center-wrapper';

        const grid = document.createElement('div');
        grid.className = 'membership-grid';

        const canEditOrDelete = userRoles.includes('ADMINISTRADOR') || userRoles.includes('EMPLEADO');

        grid.innerHTML = planesAnaliticas.map(plan => {
             // Validar datos del plan antes de usarlos
             const planId = plan.id ?? 'N/A';
             const planNombre = plan.nombrePlan || plan.nombre || 'Plan Sin Nombre';
             const planPrecio = plan.precio != null ? Number(plan.precio).toFixed(2) : 'N/A';
             const planDuracion = plan.duracionDias ?? 'N/A';
             const planDesc = plan.descripcion || 'Sin descripción.';
             const planActivo = plan.activo; // Asumimos que viene del backend
             const totalClientes = plan.clientesActivos != null ? plan.clientesActivos : 0;
             const planReglas = plan.reglasAcceso || 'Sin reglas especificadas';


            const actionButtons = canEditOrDelete ? `
            <div class="membership-card-footer">
                <button class="action-btn btn-edit" data-id="${planId}" title="Editar Plan"><i class="material-icons">edit</i></button>
                <button class="action-btn btn-delete" data-id="${planId}" title="Eliminar Plan"><i class="material-icons">delete</i></button>
            </div>
            ` : '';

             // Añadir clase si el plan está inactivo
             const inactiveClass = planActivo === false ? 'inactive-plan' : '';


            return `
            <div class="membership-card ${inactiveClass}">
                 ${planActivo === false ? '<span class="inactive-badge">INACTIVO</span>' : ''}
                <div class="membership-card-header"><h3>${planNombre}</h3></div>
                <div class="membership-card-body">
                     <p class="price">Q${planPrecio}<span> / ${planDuracion} días</span></p>
                    <p class="description">${planDesc}</p>
                    <div class="plan-analytics">
                        <div class="analytics-item">
                            <i class="material-icons">person</i>
                            <p><strong>${totalClientes}</strong> Clientes Activos</p>
                        </div>
                        <div class="analytics-item" title="${planReglas}">
                            <i class="material-icons">gavel</i>
                             <p>Reglas: ${planReglas.substring(0, 20)}${planReglas.length > 20 ? '...' : ''}</p>
                        </div>
                    </div>
                </div>
                ${actionButtons}
            </div>
            `;
        }).join('');

        gridWrapper.appendChild(grid);
        contentArea.appendChild(gridWrapper);
         console.log("Tarjetas de membresías renderizadas."); // Log
    }

    // --- PAGOS SECTION LOGIC ---
    async function loadPagosSection() {
         console.log("Cargando sección de pagos..."); // Log
        contentArea.innerHTML = `
        <div class="pagos-container">
            <div class="pagos-sidebar card">
                <h3>Previsión de Vencimiento</h3>
                <div id="vencimientos-proximos">
                     <div class="loading-spinner small"></div>
                </div>
                <button id="add-pago-btn" class="btn-accent full-width" style="margin-top: 1.5rem;">
                    <i class="material-icons">add</i> Registrar Pago
                </button>
            </div>
            <div class="pagos-main">
                <h2>Estado de Clientes (${new Date().toLocaleDateString('es-ES', { month: 'long' })})</h2>
                <div class="payment-client-grid" id="clientes-status-grid">
                     <div class="loading-spinner"></div>
                </div>
            </div>
        </div>
        `;

         const addPagoBtn = document.getElementById('add-pago-btn');
         if (addPagoBtn) {
              addPagoBtn.addEventListener('click', () => showPagoRegistroModal()); // Llamar sin ID abre modal general
         } else {
              console.error("Botón 'add-pago-btn' no encontrado.");
         }

        try {
            const response = await fetch(`${API_BASE_URL}/pagos/clientes-status`, { headers: { 'Authorization': `Bearer ${token}` } });
             console.log(`Respuesta fetch /pagos/clientes-status: Status ${response.status}`); // Log
            if (!response.ok) throw new Error(`Error ${response.status}: No se pudo cargar el estado de clientes.`);
            const clientesStatus = await response.json();
             console.log("Datos de estado de clientes recibidos:", clientesStatus); // Log

            displayPagos(clientesStatus);
            displayVencimientos(clientesStatus);
             console.log("Sección de pagos cargada."); // Log
        } catch (error) {
             console.error("Error cargando status de pagos:", error);
            const grid = document.getElementById('clientes-status-grid');
            const vencimientos = document.getElementById('vencimientos-proximos');
            if(grid) grid.innerHTML = `<p class="error">Error al cargar el estado de pagos: ${error.message}</p>`;
            if(vencimientos) vencimientos.innerHTML = `<p class="error">Error al cargar vencimientos</p>`;
        }
    }

    function displayPagos(clientesStatus) {
        const grid = document.getElementById('clientes-status-grid');
        if (!grid) {
             console.error("Elemento #clientes-status-grid no encontrado para mostrar pagos.");
             return;
        }
         console.log(`Renderizando ${clientesStatus?.length || 0} tarjetas de estado de cliente.`); // Log

        if (!clientesStatus || clientesStatus.length === 0) {
             grid.innerHTML = '<p>No hay clientes con estado de pago para mostrar.</p>';
             return;
        }

        grid.innerHTML = clientesStatus.map(cliente => {
             // Validar datos antes de usar
             const estadoPagoLower = cliente.estadoPago?.toLowerCase() || 'desconocido';
             const clienteId = cliente.clienteId ?? 'N/A'; // Usar clienteId que viene del DTO
             const nombreCompleto = cliente.nombreCompleto || 'Nombre Desconocido';
             const codigoCliente = cliente.codigoCliente || 'N/A';
             const correo = cliente.correo || 'N/A';
             const fechaVencimientoFormatted = cliente.fechaVencimiento ? new Date(cliente.fechaVencimiento).toLocaleDateString() : '';
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
                    ${fechaVencimientoFormatted ? `<p><strong>Vencimiento:</strong> ${fechaVencimientoFormatted}</p>` : ''}
                    ${montoPendienteFormatted ? `<p class="monto-pendiente">Pendiente: <span>${montoPendienteFormatted}</span></p>` : ''}
                </div>
                <div class="actions">
                     <!-- Usar clienteId del DTO -->
                    <button class="action-btn btn-history" data-id="${clienteId}" title="Ver Historial"><i class="material-icons">history</i></button>
                    <button class="action-btn btn-register-payment" data-id="${clienteId}" title="Registrar Pago"><i class="material-icons">receipt</i></button>
                </div>
            </div>
            `;
            }).join('');

        // Añadir listeners DESPUÉS de crear los botones
        grid.querySelectorAll('.btn-register-payment').forEach(btn => {
            const clientId = btn.dataset.id;
            if(clientId !== 'N/A') { // Solo añadir listener si el ID es válido
                 btn.addEventListener('click', () => showPagoRegistroModal(clientId));
            }
        });
        grid.querySelectorAll('.btn-history').forEach(btn => {
             const clientId = btn.dataset.id;
             if(clientId !== 'N/A') {
                  btn.addEventListener('click', () => showHistorialPagosModal(clientId));
             }
         });
         console.log("Tarjetas de estado de cliente renderizadas."); // Log
    }


    async function showPagoRegistroModal(clienteId = null) {
        // Verificar permisos
        if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('EMPLEADO')) {
             alert('No tienes permiso para registrar pagos.');
             return;
        }

        const isRegistrationFromCard = clienteId !== null;
        modalTitle.textContent = 'Registro de Pago';
         console.log(isRegistrationFromCard ? `Abriendo modal de registro de pago para cliente ID ${clienteId}` : "Abriendo modal de registro de pago general"); // Log

        let clienteNombre = '';
        let membresiaActivaId = '';
        let montoSugerido = '';

        // Pre-mostrar modal con carga si viene de tarjeta
        if (isRegistrationFromCard) {
            modalBody.innerHTML = '<div class="loading-spinner small"></div>';
            unifiedModal.style.display = 'flex';
            try {
                 // Fetch cliente para nombre
                 console.log(`Buscando datos del cliente ${clienteId} para pre-llenar...`); // Log
                 const clienteRes = await fetch(`${API_BASE_URL}/clientes/${clienteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
                 if (!clienteRes.ok) throw new Error(`Cliente ${clienteId} no encontrado (${clienteRes.status})`);
                 const clienteData = await clienteRes.json();
                 clienteNombre = `${clienteData.persona?.nombre || ''} ${clienteData.persona?.apellido || ''}`.trim();

                 // Fetch membresía activa (necesitaría endpoint: /api/membresias/cliente/{clienteId}/activa)
                 console.log(`Buscando membresía activa para cliente ${clienteId}...`); // Log
                 // const membresiaRes = await fetch(`${API_BASE_URL}/membresias/cliente/${clienteId}/activa`, { headers: { 'Authorization': `Bearer ${token}` } });
                 // if (membresiaRes.ok) {
                 //    const membresiaData = await membresiaRes.json();
                 //    membresiaActivaId = membresiaData.id;
                 //    console.log(`Membresía activa encontrada: ID ${membresiaActivaId}`); // Log
                 //    // Opcional: buscar monto del plan
                 // } else {
                 //     console.log(`No se encontró membresía activa para cliente ${clienteId} (Status ${membresiaRes.status})`); // Log
                 // }

                 // SIMULACIÓN (Quitar cuando el endpoint exista)
                 console.warn("Simulando búsqueda de membresía activa. Implementar endpoint real.");
                 // membresiaActivaId = 1; // Ejemplo


            } catch(error) {
                 console.warn("Error buscando datos pre-registro:", error);
                 alert(`Advertencia: No se pudieron cargar todos los datos del cliente (${error.message}). Por favor, verifica la información.`);
                 // Continuar con el modal básico si falla
            }
        }


        modalBody.innerHTML = `
        <form id="registro-pago-form" class="modal-form">
            <h4 class="form-title">Detalles del Pago</h4>
            <div class="form-grid">
                ${isRegistrationFromCard ?
                    `<div class="form-group full-width"><label>Cliente</label><input type="text" class="input" value="${clienteNombre || 'No encontrado'} (ID: ${clienteId})" disabled><input type="hidden" id="clienteId" value="${clienteId}"></div>`
                    :
                    `<div class="form-group full-width"><label for="cliente-search">Buscar Cliente (ID, Nombre, Código)</label><input type="text" id="cliente-search" class="input" placeholder="Escribe para buscar..." required><div id="cliente-search-results"></div><input type="hidden" id="clienteId" required></div>`
                }

                <div class="form-group"><label for="membresiaId">ID Membresía a Pagar</label><input type="number" id="membresiaId" class="input" value="${membresiaActivaId}" placeholder="ID de la membresía" required></div>
                <div class="form-group"><label for="monto">Monto Pagado (Q)</label><input type="number" id="monto" class="input" step="0.01" value="${montoSugerido}" min="0.01" required></div>
                <div class="form-group"><label for="metodo">Método de Pago</label>
                    <select id="metodo" class="input" required>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                </div>
                 <div class="form-group full-width"><label for="notasPago">Notas (Opcional)</label><textarea id="notasPago" class="input" rows="2"></textarea></div>
            </div>
            <div class="modal-footer"><button type="submit" class="btn-accent">Confirmar Registro</button></div>
        </form>
        `;

         if (!isRegistrationFromCard) {
              setupClienteSearch();
              unifiedModal.style.display = 'flex'; // Mostrar modal si no se mostró antes
         }

        document.getElementById('registro-pago-form').addEventListener('submit', handlePagoFormSubmit);
    }

    // Búsqueda de clientes para modal de pago general
    function setupClienteSearch() {
        const searchInput = document.getElementById('cliente-search');
        const resultsContainer = document.getElementById('cliente-search-results');
        const clienteIdInput = document.getElementById('clienteId');
        let searchTimeout;

         if (!searchInput || !resultsContainer || !clienteIdInput) {
              console.error("Elementos necesarios para búsqueda de cliente no encontrados en el modal.");
              return;
         }

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = searchInput.value.trim();
            resultsContainer.innerHTML = '';
            clienteIdInput.value = '';

            if (query.length < 2) return;

            resultsContainer.innerHTML = 'Buscando...';
             console.log(`Buscando clientes con query: ${query}`); // Log

            searchTimeout = setTimeout(async () => {
                try {
                     // Endpoint: /api/clientes/buscar?query=...
                    const response = await fetch(`${API_BASE_URL}/clientes/buscar?query=${encodeURIComponent(query)}`, { headers: { 'Authorization': `Bearer ${token}` } });
                     console.log(`Respuesta búsqueda cliente: Status ${response.status}`); // Log
                    if (!response.ok) throw new Error(`Error ${response.status}`);
                    const clientes = await response.json();
                     console.log(`Clientes encontrados: ${clientes.length}`); // Log

                    if (clientes.length === 0) {
                        resultsContainer.innerHTML = '<div class="search-no-results">No se encontraron clientes.</div>';
                        return;
                    }

                    resultsContainer.innerHTML = clientes.map(c => `
                        <div class="search-result-item" data-id="${c.id}" data-name="${c.nombrePersona || ''}">
                             ${c.nombrePersona || 'Sin Nombre'} (${c.codigoCliente || c.emailPersona || 'ID: '+c.id})
                        </div>
                    `).join('');

                     resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                          item.addEventListener('click', () => {
                               const selectedName = item.dataset.name;
                               const selectedId = item.dataset.id;
                               searchInput.value = selectedName;
                               clienteIdInput.value = selectedId;
                               resultsContainer.innerHTML = ''; // Limpiar
                                console.log(`Cliente seleccionado: ID ${selectedId}, Nombre ${selectedName}`); // Log
                               // TODO (Opcional): Buscar membresía activa del cliente seleccionado
                          });
                     });

                } catch (error) {
                    console.error("Error buscando cliente:", error);
                    resultsContainer.innerHTML = '<div class="search-error">Error al buscar.</div>';
                }
            }, 500);
        });
    }

    async function handlePagoFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
         console.log("Intentando registrar pago..."); // Log

        const body = {
            clienteId: parseInt(form.elements.clienteId?.value), // Usar optional chaining
            membresiaId: parseInt(form.elements.membresiaId?.value),
            montoPagado: parseFloat(form.elements.monto?.value),
            metodo: form.elements.metodo?.value,
            notas: form.elements.notasPago?.value.trim() || null
        };

         // Validaciones más robustas
         if (isNaN(body.clienteId)) { alert("ID de Cliente inválido."); return; }
         if (isNaN(body.membresiaId)) { alert("ID de Membresía inválido."); return; }
         if (isNaN(body.montoPagado) || body.montoPagado <= 0) { alert("El monto pagado debe ser un número positivo."); return; }
         if (!body.metodo) { alert("Selecciona un método de pago."); return; }

         console.log("Enviando datos de pago:", body); // Log

        try {
            const response = await fetch(`${API_BASE_URL}/pagos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
             console.log(`Respuesta registro pago: Status ${response.status}`); // Log

            if (!response.ok) {
                const errorText = await response.text();
                 console.error(`Error ${response.status} al registrar pago: ${errorText}`); // Log
                throw new Error(errorText || `Error ${response.status}`);
            }

            alert(`Pago de Q${body.montoPagado.toFixed(2)} registrado con éxito.`);
            closeModal();
            loadContent('pagos'); // Recargar la vista de estados
        } catch (error) {
             console.error("Error al registrar pago:", error);
            alert(`Error al registrar el pago: ${error.message}`);
        }
    }

    async function showHistorialPagosModal(clienteId) {
        modalTitle.textContent = `Historial de Pagos (Cliente ID ${clienteId})`;
        modalBody.innerHTML = '<div class="loading-spinner small"></div>';
        unifiedModal.style.display = 'flex';
         console.log(`Cargando historial de pagos para cliente ID ${clienteId}`); // Log

        try {
            // Endpoint: /api/pagos/cliente/{id}
            const response = await fetch(`${API_BASE_URL}/pagos/cliente/${clienteId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
             console.log(`Respuesta historial pagos: Status ${response.status}`); // Log

            if (!response.ok) throw new Error(`Error ${response.status}: No se pudo cargar el historial.`);
            const historial = await response.json(); // Asumimos List<Pago>
             console.log(`Historial recibido (${historial?.length || 0} items):`, historial); // Log

            if (!historial || historial.length === 0) {
                modalBody.innerHTML = '<p>No se encontró historial de pagos para este cliente.</p>';
                return;
            }

            let tableHTML = `<table class="content-table">
                                <thead>
                                    <tr><th>ID Pago</th><th>Monto (Q)</th><th>Método</th><th>Fecha Pago</th><th>Membresía ID</th><th>Notas</th></tr>
                                </thead>
                                <tbody>`;

            historial.forEach(pago => {
                 const fechaPagoFormatted = pago.pagadoEn ? new Date(pago.pagadoEn).toLocaleString('es-GT', {dateStyle: 'short', timeStyle: 'short'}) : 'N/A';
                 const membresiaId = pago.membresiaId ?? pago.membresia?.id ?? 'N/A'; // Intentar obtener ID
                tableHTML += `<tr>
                                <td>${pago.id}</td>
                                <td>Q${Number(pago.montoPagado || 0).toFixed(2)}</td>
                                <td>${pago.metodo || 'N/A'}</td>
                                <td>${fechaPagoFormatted}</td>
                                <td>${membresiaId}</td>
                                <td>${pago.notas || ''}</td>
                              </tr>`;
            });

            tableHTML += `</tbody></table>`;
            modalBody.innerHTML = tableHTML;
             console.log("Historial de pagos renderizado."); // Log

        } catch (error) {
             console.error("Error cargando historial:", error);
            modalBody.innerHTML = `<p class="error">Error al cargar el historial: ${error.message}. Verifica el endpoint y permisos.</p>`;
        }
    }


    // --- MODAL LOGIC (PERSONA UNIFICADA) ---
     function showPersonaModal(data = null, section = 'clientes') {
         const isEdit = data !== null;
         let modalModeTitle = '';
         let showRoleSelector = !isEdit;
         let currentRole = section.toUpperCase().replace(/S$/, '');

          // Determinar título y datos de persona/usuario según el modo
          let persona = {};
          let usuarioData = {}; // Para username, activo, etc. al editar
          let entityId = ''; // ID de Cliente, Empleado o Usuario
          let personaId = '';

          if (isEdit) {
              if (section === 'administradores') {
                   // data es el objeto Usuario con Persona anidada
                   usuarioData = data;
                   persona = data.persona || {};
                   entityId = data.id; // ID del Usuario
                   personaId = persona.id;
                   modalModeTitle = `Editar Administrador: ${usuarioData.username || 'ID ' + entityId}`;
              } else {
                   // data es el objeto Cliente o Empleado con Persona anidada
                   persona = data.persona || {};
                   entityId = data.id; // ID de Cliente o Empleado
                   personaId = persona.id;
                   modalModeTitle = `Editar ${section.slice(0, -1)}`;
                    // Necesitamos buscar el Usuario asociado para editar username/activo
                    // Esto requerirá una llamada extra en handlePersonaFormSubmit o aquí
              }
          } else {
              modalModeTitle = 'Crear Nueva Persona y Asignar Rol';
              // Al crear, el rol inicial puede venir de la sección
              if (section === 'administradores') currentRole = 'ADMINISTRADOR';
              else if (section === 'empleados') currentRole = 'EMPLEADO';
              else currentRole = 'CLIENTE'; // Default
          }

         modalTitle.textContent = modalModeTitle;
          console.log(`${modalModeTitle} - Persona ID: ${personaId}, Entidad ID: ${entityId}, Rol: ${currentRole}`); // Log

         // Formatear fecha de nacimiento para el input date
         const fechaNacimientoValue = persona.fechaNacimiento ? persona.fechaNacimiento.split('T')[0] : '';

         modalBody.innerHTML = `
         <form id="persona-form" class="modal-form">
             <input type="hidden" id="entityId" value="${entityId}">
             <input type="hidden" id="personaId" value="${personaId}">
             <input type="hidden" id="currentSection" value="${section}">

             <h4 class="form-title">Datos Personales</h4>
             <div class="form-grid">
                 <div class="form-group"><label for="nombre">Nombre</label><input type="text" id="nombre" class="input" value="${persona.nombre || ''}" required></div>
                 <div class="form-group"><label for="apellido">Apellido</label><input type="text" id="apellido" class="input" value="${persona.apellido || ''}" required></div>
                 <div class="form-group"><label for="correo">Correo Electrónico</label><input type="email" id="correo" class="input" value="${persona.correo || ''}" required></div>
                 <div class="form-group"><label for="telefono">Teléfono Principal</label><input type="tel" id="telefono" class="input" value="${persona.telefono || ''}"></div>
                 <div class="form-group"><label for="fechaNacimiento">F. Nacimiento</label><input type="date" id="fechaNacimiento" class="input" value="${fechaNacimientoValue}"></div>
                 <div class="form-group"><label for="sexo">Sexo</label>
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
                 <div class="form-group full-width"><label for="notas">Notas</label><textarea id="notas" class="input" rows="2">${persona.notas || ''}</textarea></div>
             </div>

             ${showRoleSelector ? `
                 <h4 class="form-title">Tipo de Entidad y Acceso</h4>
                 <div class="form-grid">
                     <div class="form-group full-width"><label for="role-selector">Rol a Asignar</label>
                         <select id="role-selector" class="input" required>
                             <option value="CLIENTE" ${currentRole === 'CLIENTE' ? 'selected' : ''}>Cliente (Socio)</option>
                             <option value="EMPLEADO" ${currentRole === 'EMPLEADO' ? 'selected' : ''}>Empleado (Personal)</option>
                             <option value="ADMINISTRADOR" ${currentRole === 'ADMINISTRADOR' ? 'selected' : ''}>Administrador</option>
                         </select>
                     </div>
                 </div>
                 <div id="user-credentials-fields">
                     <h4 class="form-title">Credenciales de Acceso</h4>
                     <p class="form-hint">Necesarias para iniciar sesión.</p>
                     <div class="form-grid">
                         <div class="form-group"><label for="username">Nombre de Usuario</label><input type="text" id="username" class="input" required></div>
                         <div class="form-group"><label for="password">Contraseña</label><input type="password" id="password" class="input" required></div>
                     </div>
                 </div>
             ` : ''}

              <!-- Sección para editar username/password (SOLO al editar y si es Admin/Empleado/User) -->
             ${isEdit && (section === 'clientes' || section === 'empleados' || section === 'administradores') ? `
                 <div id="edit-user-credentials-fields">
                      <h4 class="form-title">Credenciales de Acceso (Editar)</h4>
                      <div class="form-grid">
                            <!-- Necesitamos el ID del usuario aquí -->
                           <input type="hidden" id="usuarioId" value="${section === 'administradores' ? entityId : ''}"> <!-- Llenar si es admin, vacío si no -->
                           <div class="form-group"><label for="username">Nombre de Usuario</label><input type="text" id="username" class="input" value="${usuarioData.username || ''}" required></div>
                           <div class="form-group"><label for="newPassword">Nueva Contraseña</label><input type="password" id="newPassword" class="input" placeholder="Dejar en blanco para no cambiar"></div>
                      </div>
                      <div class="form-group full-width" style="margin-top: 0.5rem;">
                           <label><input type="checkbox" id="activoUsuario" ${usuarioData.activo !== false ? 'checked' : ''}> Usuario Activo (Puede iniciar sesión)</label>
                      </div>
                 </div>
             ` : ''}

             <!-- Campos específicos del rol -->
             <div id="role-specific-fields">
                 ${isEdit && section === 'clientes' ?
                     `<h4>Datos de Cliente</h4><div class="form-grid"><div class="form-group full-width"><label for="fechaInicio">Fecha de Inicio</label><input type="date" id="fechaInicio" class="input" value="${data.fechaInicio?.split('T')[0] || ''}" required></div></div>`
                 : isEdit && section === 'empleados' ?
                      `<h4>Datos de Empleado</h4><div class="form-grid"><div class="form-group"><label for="salario">Salario (Q)</label><input type="number" id="salario" class="input" value="${data.salario || ''}" min="0" step="0.01" required></div><div class="form-group"><label for="fechaContratacion">Fecha Contratación</label><input type="date" id="fechaContratacion" class="input" value="${data.fechaContratacion?.split('T')[0] || ''}" required></div></div>`
                 : ''
                 }
             </div>

             <div class="modal-footer"><button type="submit" class="btn-accent">${isEdit ? 'Guardar Cambios' : 'Crear y Asignar Rol'}</button></div>
         </form>
         `;

         if (showRoleSelector) {
             const roleSelector = document.getElementById('role-selector');
             if(roleSelector) {
                  roleSelector.addEventListener('change', updateSpecificFieldsOnCreate);
                  updateSpecificFieldsOnCreate(); // Llamada inicial para mostrar campos correctos
             }
         }

          // Si estamos editando Cliente o Empleado, necesitamos buscar su Usuario asociado
          // para pre-llenar los campos de credenciales. Hacemos esto DESPUÉS de renderizar el modal.
          if (isEdit && (section === 'clientes' || section === 'empleados')) {
               findAndFillAssociatedUser(personaId); // Buscar usuario por personaId
          }


         // Listener para el formulario
          const personaForm = document.getElementById('persona-form');
          if(personaForm) personaForm.addEventListener('submit', handlePersonaFormSubmit);

         unifiedModal.style.display = 'flex';
     }

     // Función para buscar y llenar datos de usuario al editar Cliente/Empleado
     async function findAndFillAssociatedUser(personaId) {
          if (!personaId) return; // No buscar si no hay personaId
          console.log(`Buscando usuario asociado a persona ID ${personaId}...`); // Log
          const usernameInput = document.getElementById('username');
          const activoCheckbox = document.getElementById('activoUsuario');
          const usuarioIdInput = document.getElementById('usuarioId'); // Input oculto

           if (!usernameInput || !activoCheckbox || !usuarioIdInput) {
                console.warn("Campos de edición de usuario no encontrados en el modal.");
                return;
           }

          try {
               // Endpoint: /api/usuarios/por-persona/{personaId}
               const response = await fetch(`${API_BASE_URL}/usuarios/por-persona/${personaId}`, { headers: { 'Authorization': `Bearer ${token}` } });
                console.log(`Respuesta búsqueda usuario por persona ${personaId}: Status ${response.status}`); // Log

               if (response.ok) {
                    const usuario = await response.json();
                     console.log("Usuario asociado encontrado:", usuario); // Log
                    usernameInput.value = usuario.username || '';
                    activoCheckbox.checked = usuario.activo !== false; // Marcar si es true o null/undefined
                    usuarioIdInput.value = usuario.id; // Guardar el ID del usuario encontrado
               } else if (response.status === 404) {
                    console.log(`No se encontró usuario asociado a persona ID ${personaId}.`); // Log
                    // Dejar campos vacíos o deshabilitados si no hay usuario
                    usernameInput.value = '';
                    activoCheckbox.checked = false;
                    usuarioIdInput.value = ''; // Asegurar que esté vacío
                    // Opcional: deshabilitar campos
                    // usernameInput.disabled = true;
                    // document.getElementById('newPassword').disabled = true;
                    // activoCheckbox.disabled = true;
               } else {
                    // Otro error
                    throw new Error(`Error ${response.status} al buscar usuario asociado.`);
               }
          } catch (error) {
               console.error("Error buscando usuario asociado:", error);
               // Dejar campos vacíos en caso de error
               usernameInput.value = '';
               activoCheckbox.checked = false;
               usuarioIdInput.value = '';
               alert(`Error al buscar datos de acceso del usuario: ${error.message}`);
          }
     }


     // Actualizar campos específicos SOLO AL CREAR
     function updateSpecificFieldsOnCreate() {
          const roleSelector = document.getElementById('role-selector');
          const specificFieldsContainer = document.getElementById('role-specific-fields');
           if(!roleSelector || !specificFieldsContainer) return; // Salir si no existen

          const role = roleSelector.value;
          let specificFieldsHTML = '';
           console.log(`Actualizando campos específicos para el rol seleccionado (creación): ${role}`); // Log

          if (role === 'CLIENTE') {
               specificFieldsHTML = `
               <h4>Datos de Cliente</h4><div class="form-grid"><div class="form-group full-width"><label for="fechaInicio">Fecha de Inicio</label><input type="date" id="fechaInicio" class="input" value="${new Date().toISOString().split('T')[0]}" required></div></div>`;
          } else if (role === 'EMPLEADO') {
               specificFieldsHTML = `
               <h4>Datos de Empleado</h4><div class="form-grid"><div class="form-group"><label for="salario">Salario (Q)</label><input type="number" id="salario" class="input" min="0" step="0.01" required></div><div class="form-group"><label for="fechaContratacion">Fecha Contratación</label><input type="date" id="fechaContratacion" class="input" value="${new Date().toISOString().split('T')[0]}" required></div></div>`;
          }
          // Admin no tiene campos específicos

          specificFieldsContainer.innerHTML = specificFieldsHTML;
     }

    async function handlePersonaFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const entityId = form.elements.entityId?.value;
        const personaId = form.elements.personaId?.value;
        const currentSection = form.elements.currentSection?.value;
        const isEdit = entityId !== '';
         console.log(`Submit form - Modo Edición: ${isEdit}, Sección: ${currentSection}, Entidad ID: ${entityId}, Persona ID: ${personaId}`); // Log

        // 1. Recolectar Datos de Persona
        const personaBody = {
            ...(personaId && { id: personaId }), // ID si existe
            nombre: form.elements.nombre?.value.trim(),
            apellido: form.elements.apellido?.value.trim(),
            correo: form.elements.correo?.value.trim(),
            telefono: form.elements.telefono?.value.trim() || null,
            fechaNacimiento: form.elements.fechaNacimiento?.value || null,
            sexo: form.elements.sexo?.value || null,
            estadoCivil: form.elements.estadoCivil?.value.trim() || null,
            direccion: form.elements.direccion?.value.trim() || null,
            telefonoEmergencia: form.elements.telefonoEmergencia?.value.trim() || null,
            notas: form.elements.notas?.value.trim() || null,
            activo: true // Asumir persona activa
        };

         // Validación Persona
         if (!personaBody.nombre || !personaBody.apellido || !personaBody.correo) {
              alert("Nombre, Apellido y Correo son obligatorios."); return;
         }
         // Limpiar sexo si es vacío
         if (personaBody.sexo === "") personaBody.sexo = null;


        // 2. Variables para API
        let url = '';
        let method = '';
        let finalBody = {};
         let requiresUserUpdate = false; // Flag para saber si hay que actualizar Usuario además de Cliente/Empleado
         let usuarioBody = {}; // Objeto para la actualización del usuario

        // 3. Construir Body y URL
        if (isEdit) {
            method = 'PUT';
            if (currentSection === 'clientes' || currentSection === 'empleados') {
                 url = `${API_BASE_URL}/${currentSection}/${entityId}`;
                 finalBody = { persona: personaBody };
                 if (currentSection === 'clientes') {
                      finalBody.fechaInicio = form.elements.fechaInicio?.value;
                 } else { // Empleados
                      finalBody.salario = parseFloat(form.elements.salario?.value);
                      finalBody.fechaContratacion = form.elements.fechaContratacion?.value;
                      if(isNaN(finalBody.salario) || finalBody.salario < 0) { alert("Salario inválido."); return; }
                      if(!finalBody.fechaContratacion) { alert("Fecha de contratación requerida."); return; }
                 }

                 // Verificar si hay datos de usuario para actualizar
                 const usuarioId = form.elements.usuarioId?.value;
                 if (usuarioId && form.elements.username?.value) {
                      requiresUserUpdate = true;
                      usuarioBody = {
                           id: usuarioId, // ID del Usuario asociado
                           persona: { id: personaId }, // Solo necesitamos el ID de persona aquí
                           username: form.elements.username.value.trim(),
                           activo: form.elements.activoUsuario?.checked ?? true,
                           ...(form.elements.newPassword?.value && { password: form.elements.newPassword.value })
                      };
                       if (!usuarioBody.username) { alert("El nombre de usuario es obligatorio."); return; }
                 }

            } else if (currentSection === 'administradores') {
                 // Al editar admin, solo actualizamos el Usuario (que contiene Persona)
                 url = `${API_BASE_URL}/usuarios/${entityId}`;
                 finalBody = {
                      id: entityId,
                      persona: personaBody, // Datos completos de Persona
                      username: form.elements.username?.value.trim(),
                      activo: form.elements.activoUsuario?.checked ?? true,
                      ...(form.elements.newPassword?.value && { password: form.elements.newPassword.value })
                      // No se modifican roles aquí
                 };
                  if (!finalBody.username) { alert("El nombre de usuario es obligatorio."); return; }
            }

        } else { // Creación
            method = 'POST';
            url = `${API_BASE_URL}/personas/unified`;
            const rol = form.elements['role-selector']?.value;
            finalBody = {
                ...personaBody,
                rol: rol,
                username: form.elements.username?.value.trim(),
                password: form.elements.password?.value
            };

             if (!rol || !finalBody.username || !finalBody.password) {
                  alert("Rol, Usuario y Contraseña son obligatorios al crear."); return;
             }

            if (rol === 'CLIENTE') {
                finalBody.fechaInicio = form.elements.fechaInicio?.value;
                 if (!finalBody.fechaInicio) { alert("Fecha de inicio obligatoria para Cliente."); return; }
            } else if (rol === 'EMPLEADO') {
                finalBody.salario = parseFloat(form.elements.salario?.value);
                finalBody.fechaContratacion = form.elements.fechaContratacion?.value;
                 if (isNaN(finalBody.salario) || finalBody.salario <=0 || !finalBody.fechaContratacion) {
                      alert("Salario y Fecha de Contratación válidos obligatorios para Empleado."); return;
                 }
            }
        }

        console.log(`Enviando ${method} a ${url} con body:`, finalBody); // Log
         if (requiresUserUpdate) console.log("Se requiere actualización adicional de Usuario:", usuarioBody); // Log

        // 4. Enviar Petición(es)
        try {
            // Petición Principal (Crear unificado o Editar Entidad)
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(finalBody)
            });
             console.log(`Respuesta ${method} ${url}: Status ${response.status}`); // Log

            if (!response.ok) {
                const errorText = await response.text();
                 console.error(`Error ${response.status} en petición principal: ${errorText}`); // Log
                throw new Error(errorText || `Error ${response.status}`);
            }

             // Si se editó Cliente/Empleado y se requiere actualizar Usuario
             if (isEdit && requiresUserUpdate) {
                  console.log(`Enviando PUT a /usuarios/${usuarioBody.id} para actualizar credenciales...`); // Log
                  const userUpdateUrl = `${API_BASE_URL}/usuarios/${usuarioBody.id}`;
                  const userUpdateResponse = await fetch(userUpdateUrl, {
                       method: 'PUT',
                       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                       body: JSON.stringify(usuarioBody)
                  });
                   console.log(`Respuesta PUT ${userUpdateUrl}: Status ${userUpdateResponse.status}`); // Log

                   if (!userUpdateResponse.ok) {
                        const userErrorText = await userUpdateResponse.text();
                        console.error(`Error ${userUpdateResponse.status} al actualizar usuario: ${userErrorText}`); // Log
                         // Lanzar error o mostrar advertencia de que la entidad principal se guardó pero el usuario no
                        throw new Error(`Error al actualizar datos de acceso: ${userErrorText || userUpdateResponse.status}`);
                   }
             }


            alert(`Registro ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
            closeModal();
            loadContent(currentSection); // Recargar la sección

        } catch (error) {
             console.error(`Error en handlePersonaFormSubmit:`, error);
            alert(`Error al guardar: ${error.message}`);
        }
    }


    function showMembresiaModal(data = null) {
        const isEdit = data !== null;
        modalTitle.textContent = isEdit ? 'Editar Plan de Membresía' : 'Crear Nuevo Plan';
         console.log(isEdit ? `Abriendo modal para editar plan ID ${data.id}` : "Abriendo modal para crear plan"); // Log

         if (!userRoles.includes('ADMINISTRADOR')) {
              alert('No tienes permiso para gestionar planes.');
              return;
         }

         const defaults = { id: null, nombre: '', precio: '', duracionDias: '', descripcion: '', activo: true, reglasAcceso: '', ...(isEdit ? data : {})};

        modalBody.innerHTML = `
            <form id="membresia-form" class="modal-form">
                <input type="hidden" id="planId" value="${defaults.id || ''}">
                <h4 class="form-title">Detalles del Plan</h4>
                <div class="form-grid">
                    <div class="form-group full-width"><label for="nombre">Nombre del Plan</label><input type="text" id="nombre" class="input" value="${defaults.nombre}" required></div>
                    <div class="form-group"><label for="precio">Precio (Q)</label><input type="number" id="precio" class="input" value="${defaults.precio}" min="0" step="0.01" required></div>
                    <div class="form-group"><label for="duracion">Duración (días)</label><input type="number" id="duracion" class="input" value="${defaults.duracionDias}" min="1" required></div>
                    <div class="form-group full-width"><label for="descripcion">Descripción</label><textarea id="descripcion" class="input" rows="2">${defaults.descripcion || ''}</textarea></div>
                    <div class="form-group full-width"><label for="reglasAcceso">Reglas de Acceso (Ej: L-V 6am-10pm)</label><input type="text" id="reglasAcceso" class="input" value="${defaults.reglasAcceso || ''}"></div>
                     <div class="form-group full-width" style="margin-top: 1rem;">
                           <label><input type="checkbox" id="activoPlan" ${defaults.activo !== false ? 'checked' : ''}> Plan Activo (Ofrecido)</label>
                      </div>
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
        const id = form.elements.planId?.value;
        const isEdit = id !== '';
         console.log(isEdit ? `Guardando cambios para plan ID ${id}` : "Creando nuevo plan"); // Log

        const body = {
            nombre: form.elements.nombre?.value.trim(),
            precio: parseFloat(form.elements.precio?.value),
            duracionDias: parseInt(form.elements.duracion?.value),
            descripcion: form.elements.descripcion?.value.trim() || null,
             reglasAcceso: form.elements.reglasAcceso?.value.trim() || null,
             activo: form.elements.activoPlan?.checked ?? true
        };

         // Validaciones
         if (!body.nombre) { alert("El nombre del plan es obligatorio."); return; }
         if (isNaN(body.precio) || body.precio < 0) { alert("El precio debe ser un número positivo."); return; }
         if (isNaN(body.duracionDias) || body.duracionDias <= 0) { alert("La duración debe ser al menos 1 día."); return; }

        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE_URL}/planes/${id}` : `${API_BASE_URL}/planes`;
         console.log(`Enviando ${method} a ${url} con body:`, body); // Log

        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
             console.log(`Respuesta ${method} ${url}: Status ${response.status}`); // Log
            if (!response.ok) { const errorText = await response.text(); throw new Error(errorText || `Error ${response.status}`); }
            alert(`Plan ${isEdit ? 'actualizado' : 'creado'} con éxito.`);
            closeModal();
            loadContent('membresias');
        } catch (error) {
             console.error("Error guardando plan:", error);
             alert(`Error al guardar el plan: ${error.message}`);
        }
    }

    // --- GENERAL MODAL & DELETE LOGIC ---
    function closeModal() {
         if (unifiedModal) unifiedModal.style.display = 'none';
         if (modalBody) modalBody.innerHTML=''; // Limpiar contenido para evitar listeners duplicados
         console.log("Modal unificado cerrado."); // Log
    }

    function mostrarModalEliminacion(id, nombre, section) {
         console.log(`Abriendo modal de eliminación para ID ${id}, Nombre ${nombre}, Sección ${section}`); // Log
         if (!userRoles.includes('ADMINISTRADOR')) {
              alert('No tienes permiso para eliminar.');
              return;
         }

        currentIdToDelete = id;
         if (section === 'membresias') currentSectionForDelete = 'planes';
         else if (section === 'administradores') currentSectionForDelete = 'usuarios';
         else currentSectionForDelete = section; // clientes, empleados, productos

         // Evitar eliminar el propio usuario admin? (Opcional, requiere saber el ID del usuario logueado)
         // const loggedInUserId = ... // Necesitaríamos guardar el ID del usuario al loguear
         // if (currentSectionForDelete === 'usuarios' && currentIdToDelete == loggedInUserId) {
         //    alert("No puedes eliminar tu propio usuario administrador.");
         //    return;
         // }


        deleteModalText.innerHTML = `¿Estás seguro de que quieres eliminar <strong>${nombre} (ID: ${id})</strong>? Esta acción no se puede deshacer.`;
        deleteModal.style.display = 'flex';
    }

    function cerrarModalEliminacion() {
         if (deleteModal) deleteModal.style.display = 'none';
         console.log("Modal de eliminación cerrado."); // Log
     }

    async function confirmarEliminacion() {
        console.log(`Confirmando eliminación para ID ${currentIdToDelete}, Endpoint: ${currentSectionForDelete}`); // Log
        if (currentIdToDelete && currentSectionForDelete) {
            try {
                const url = `${API_BASE_URL}/${currentSectionForDelete}/${currentIdToDelete}`;
                const response = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                 console.log(`Respuesta DELETE ${url}: Status ${response.status}`); // Log

                if (!response.ok && response.status !== 204) { // 204 No Content también es éxito
                     let errorMsg = `Error ${response.status}`;
                     try { errorMsg = await response.text(); } catch(_) {}
                      console.error(`Error ${response.status} al eliminar: ${errorMsg}`); // Log
                     throw new Error(errorMsg);
                }
                alert(`Registro eliminado con éxito.`);
                 let sectionToReload = currentSectionForDelete;
                 if (currentSectionForDelete === 'planes') sectionToReload = 'membresias';
                 if (currentSectionForDelete === 'usuarios') sectionToReload = 'administradores';
                loadContent(sectionToReload);
            } catch (error) {
                 console.error("Error al eliminar:", error);
                 alert(`Error al eliminar: ${error.message}`);
            }
        } else {
             console.warn("Intento de confirmar eliminación sin ID o sección válida."); // Log
        }
        cerrarModalEliminacion();
    }


    // --- POS (VENTAS) SECTION LOGIC ---
    async function setupPOSInterface() {
         console.log("Configurando interfaz POS..."); // Log
        contentArea.innerHTML = `
            <div class="pos-container">
                <div class="product-grid-wrapper">
                     <div class="pos-filters">
                          <input type="text" id="pos-search" class="input" placeholder="Buscar producto...">
                     </div>
                    <div class="product-grid"> <div class="loading-spinner"></div> </div>
                </div>
                <div class="cart-wrapper card">
                    <h3>Carrito</h3>
                    <div class="cart-items"></div>
                    <div class="cart-summary">
                        <div class="total"><span>Total:</span><span id="cart-total">Q0.00</span></div>
                        <button id="checkout-btn" class="btn-accent full-width" disabled>Finalizar Compra</button> <!-- Deshabilitado inicialmente -->
                    </div>
                </div>
            </div>
            `;
        try {
            const products = await fetchProducts();
             console.log(`Productos cargados para POS: ${products.length}`); // Log
             productsCache = products.filter(p => p.activo && p.stockCantidad > 0);
             console.log(`Productos activos y en stock para POS: ${productsCache.length}`); // Log
            renderPOSProductGrid(productsCache);
             const checkoutBtn = document.getElementById('checkout-btn');
             const posSearchInput = document.getElementById('pos-search');
             if(checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
             if(posSearchInput) posSearchInput.addEventListener('input', filterPOSProducts);
             updateCartDisplay(); // Mostrar "Carrito vacío" y estado inicial del botón
             console.log("Interfaz POS configurada."); // Log
        } catch (error) {
             console.error("Error configurando POS:", error);
             const grid = contentArea.querySelector('.product-grid');
              if(grid) grid.innerHTML = "<p class='error'>Error al cargar productos para la venta.</p>";
        }
    }

     function filterPOSProducts() {
         const searchTerm = document.getElementById('pos-search')?.value.toLowerCase() || '';
          console.log(`Filtrando productos POS con término: "${searchTerm}"`); // Log
         const filtered = productsCache.filter(p =>
              p.activo && p.stockCantidad > 0 && // Doble chequeo por si acaso
              ((p.nombre && p.nombre.toLowerCase().includes(searchTerm)) ||
              (p.categoria && p.categoria.toLowerCase().includes(searchTerm)))
         );
          console.log(`Productos POS filtrados: ${filtered.length}`); // Log
         renderPOSProductGrid(filtered);
     }


    async function fetchProducts() {
         console.log("Fetching productos desde API..."); // Log
        const response = await fetch(`${API_BASE_URL}/productos`, { headers: { 'Authorization': `Bearer ${token}` } });
         console.log(`Respuesta fetch /productos (para POS/Market): Status ${response.status}`); // Log
        if (!response.ok) throw new Error(`No se pudieron cargar los productos (${response.status})`);
        return await response.json();
    }

     function renderPOSProductGrid(products) {
          const grid = contentArea.querySelector('.product-grid');
          if (!grid) {
               console.error("Contenedor .product-grid no encontrado en POS.");
               return;
          }
           console.log(`Renderizando ${products.length} productos en cuadrícula POS.`); // Log

          if (products.length === 0) {
               grid.innerHTML = '<p>No se encontraron productos disponibles con ese filtro.</p>';
               return;
          }

          grid.innerHTML = products.map(p => {
               let icon = 'inventory_2';
               if (p.categoria === 'SUPLEMENTO') icon = 'fitness_center';
               else if (p.categoria === 'BEBIDA') icon = 'local_drink';
               else if (p.categoria === 'SNACK') icon = 'fastfood';
               else if (p.categoria === 'EQUIPO') icon = 'style';

               return `
               <div class="product-card pos-view" data-id="${p.id}" title="Añadir ${p.nombre || 'Producto'} al carrito">
                    <div class="product-image">
                         <i class="material-icons product-icon">${icon}</i>
                    </div>
                    <div class="product-info">
                         <h4>${p.nombre || 'Sin Nombre'}</h4>
                         <p class="product-price">Q${Number(p.precioVenta || 0).toFixed(2)}</p>
                         <p class="stock-info pos">Stock: ${p.stockCantidad ?? 'N/A'}</p>
                    </div>
               </div>
               `;
          }).join('');
     }


    function addToCart(product) {
         if (!product || product.stockCantidad <= 0) {
              alert(`"${product?.nombre || 'Producto'}" ya no tiene stock.`);
              return;
         }

        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
             if (existingItem.cantidad >= product.stockCantidad) {
                  alert(`No hay más stock disponible para "${product.nombre}".`);
                  return;
             }
            existingItem.cantidad++;
             console.log(`Cantidad aumentada para ${product.nombre} a ${existingItem.cantidad}`); // Log
        } else {
            cart.push({ ...product, cantidad: 1 });
             console.log(`${product.nombre} añadido al carrito.`); // Log
        }
        updateCartDisplay();
    }

    function updateCartDisplay() {
        const cartItemsContainer = contentArea?.querySelector('.cart-items'); // Usar optional chaining por si no estamos en 'ventas'
         if (!cartItemsContainer) return; // Salir si no estamos en la vista correcta

         console.log("Actualizando display del carrito..."); // Log
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart">El carrito está vacío.</p>';
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <h5>${item.nombre || 'Producto Sin Nombre'}</h5>
                        <div class="quantity-controls">
                            <button data-id="${item.id}" class="quantity-decrease" title="Quitar uno">-</button>
                            <span>${item.cantidad}</span>
                            <button data-id="${item.id}" class="quantity-increase" title="Añadir uno">+</button>
                        </div>
                    </div>
                    <span class="cart-item-price">Q${(Number(item.precioVenta || 0) * item.cantidad).toFixed(2)}</span>
                </div>
            `).join('');
        }
        const total = cart.reduce((sum, item) => sum + (Number(item.precioVenta || 0) * item.cantidad), 0);
        const cartTotalSpan = contentArea.querySelector('#cart-total');
        if (cartTotalSpan) cartTotalSpan.textContent = `Q${total.toFixed(2)}`;
         console.log(`Total carrito actualizado: Q${total.toFixed(2)}`); // Log

         // Re-añadir listeners
         if (cart.length > 0) {
              cartItemsContainer.querySelectorAll('.quantity-decrease').forEach(b => b.addEventListener('click', () => updateQuantity(b.dataset.id, -1)));
              cartItemsContainer.querySelectorAll('.quantity-increase').forEach(b => b.addEventListener('click', () => updateQuantity(b.dataset.id, 1)));
         }

         // Habilitar/deshabilitar checkout
         const checkoutBtn = document.getElementById('checkout-btn');
         if(checkoutBtn) checkoutBtn.disabled = cart.length === 0;
    }

    function updateQuantity(productId, change) {
         console.log(`Actualizando cantidad para producto ID ${productId}, cambio: ${change}`); // Log
        const itemIndex = cart.findIndex(i => i.id == productId); // Usar findIndex para facilitar eliminación
        if (itemIndex === -1) return;

        const item = cart[itemIndex];
        const productInCache = productsCache.find(p => p.id == productId); // Encontrar producto original para stock

        if (change > 0 && productInCache) {
             if (item.cantidad + change > productInCache.stockCantidad) {
                  alert(`No hay más stock disponible para "${item.nombre}".`);
                  return;
             }
         }

        item.cantidad += change;

        if (item.cantidad <= 0) {
             console.log(`Quitando ${item.nombre} del carrito.`); // Log
            cart.splice(itemIndex, 1); // Eliminar item usando splice
        } else {
             console.log(`Nueva cantidad para ${item.nombre}: ${item.cantidad}`); // Log
        }
        updateCartDisplay();
    }

    async function handleCheckout() {
        if (cart.length === 0) {
            alert('El carrito está vacío.');
            return;
        }

         const checkoutBtn = document.getElementById('checkout-btn');
         checkoutBtn.disabled = true;
         checkoutBtn.textContent = 'Procesando...';
         console.log("Iniciando proceso de checkout..."); // Log

         // Obtener ID del usuario logueado (necesitaría endpoint o guardarlo al loguear)
         let usuarioIdVenta = null;
         // SIMULACIÓN - REEMPLAZAR CON LÓGICA REAL
         console.warn("Simulando ID de usuario para venta. Reemplazar con ID real.");
         // if (username === 'admin') usuarioIdVenta = 1;
         // else if (username === 'ana.lopez') usuarioIdVenta = 3;


        const totalVenta = cart.reduce((sum, item) => sum + (Number(item.precioVenta || 0) * item.cantidad), 0);
        const productosVendidos = cart.map(item => ({ productoId: item.id, cantidad: item.cantidad, precioUnitario: item.precioVenta })); // Usar DTO esperado por backend

        const ventaRequest = {
             // clienteId: null, // Venta genérica por ahora
             usuarioId: usuarioIdVenta, // ID del empleado/admin
             // productosIds: cart.flatMap(item => Array(item.cantidad).fill(item.id)), // Método anterior
             detalles: productosVendidos, // Usar la nueva estructura si el backend la espera
             total: totalVenta,
             notas: "Venta POS"
        };
         console.log("Enviando petición de venta:", ventaRequest); // Log

        try {
            const response = await fetch(`${API_BASE_URL}/ventas`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(ventaRequest) });
             console.log(`Respuesta checkout: Status ${response.status}`); // Log

            if (!response.ok) {
                 const errorText = await response.text();
                 console.error(`Error ${response.status} en checkout: ${errorText}`); // Log
                 throw new Error(errorText || `Error ${response.status}`);
             }

            alert('Venta realizada con éxito!');
            cart = [];
            updateCartDisplay();

            // Recargar productos para actualizar stock visualmente
             console.log("Recargando productos después de la venta..."); // Log
             const updatedProducts = await fetchProducts();
             productsCache = updatedProducts.filter(p => p.activo && p.stockCantidad > 0);
             renderPOSProductGrid(productsCache);

        } catch (error) {
             console.error("Error en checkout:", error);
            alert(`Error al finalizar la venta: ${error.message}`);
        } finally {
             // Reactivar botón independientemente del resultado
             checkoutBtn.disabled = false;
             checkoutBtn.textContent = 'Finalizar Compra';
        }
    }

     // --- UTILITIES --- (Si fueran necesarias)

}); // Fin DOMContentLoaded
