document.addEventListener('DOMContentLoaded', () => {
    const usernameDisplay = document.getElementById('username-display');
    const logoutButton = document.getElementById('logout');
    const contentArea = document.getElementById('content-area');
    const sectionTitle = document.getElementById('section-title');
    const navLinks = document.querySelectorAll('.sidebar-nav a');

    // Datos estáticos de ejemplo
    const demoData = {
        perfil: {
            nombre: 'Francisco Sebastian',
            correo: 'francisco@ejemplo.com',
            codigoCliente: 'CLT-123'
        },
        membresia: {
            estadoPago: 'ACTIVO',
            tipoPlan: 'Plan Mensual Básico',
            fechaVencimiento: '2025-10-15T00:00:00Z'
        },
        pagos: [
            { id: 101, monto: 50.00, metodo: 'Tarjeta', fechaPago: '2025-09-15T00:00:00Z', estado: 'Pagado', fechaVencimiento: '2025-10-15T00:00:00Z' },
            { id: 102, monto: 50.00, metodo: 'Efectivo', fechaPago: '2025-08-15T00:00:00Z', estado: 'Pagado', fechaVencimiento: '2025-09-15T00:00:00Z' }
        ],
        tienda: [
            { id: 1, nombre: 'Proteína Whey Chocolate', precioVenta: 45.99, activo: true, categoria: 'SUPLEMENTO' },
            { id: 2, nombre: 'Agua pura', precioVenta: 2.50, activo: true, categoria: 'BEBIDA' },
            { id: 3, nombre: 'Chips de Camote', precioVenta: 2.00, activo: false, categoria: 'SNACK' }
        ]
    };

    // Lógica para el logout y la navegación estática
    const username = sessionStorage.getItem('username') || 'Cliente Demo';
    usernameDisplay.textContent = username;
    
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.clear();
        window.location.href = 'index.html';
    });
    navLinks.forEach(link => link.addEventListener('click', handleNavClick));
    loadContent('perfil');

    function handleNavClick(e) {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        loadContent(this.dataset.section);
    }

    async function loadContent(section) {
        sectionTitle.textContent = getSectionTitle(section);
        contentArea.innerHTML = ''; // Limpiar el contenido existente
        
        switch (section) {
            case 'perfil':
                displayMiPerfil(demoData.perfil);
                break;
            case 'membresia':
                displayMiMembresia(demoData.membresia);
                break;
            case 'pagos':
                displayMisPagos(demoData.pagos);
                break;
            case 'tienda':
                displayTienda(demoData.tienda);
                break;
            default:
                contentArea.innerHTML = `<p>Sección no encontrada.</p>`;
        }
    }

    // Funciones de renderizado
    function displayMiPerfil(perfil) {
        contentArea.innerHTML = `
            <div class="card profile-card">
                <h3>Datos Personales</h3>
                <div class="profile-details">
                    <p><strong>Nombre:</strong> ${perfil.nombre || 'N/A'}</p>
                    <p><strong>Correo:</strong> ${perfil.correo || 'N/A'}</p>
                </div>
                <h3>Información de Cliente</h3>
                <div class="profile-details">
                    <p><strong>Código:</strong> ${perfil.codigoCliente || 'N/A'}</p>
                </div>
            </div>`;
    }

    function displayMiMembresia(membresia) {
        contentArea.innerHTML = `
            <div class="card membership-card-active">
                <div class="membership-card-header">
                    <h3>Membresía Activa</h3>
                    <span class="status-badge status-verde">${membresia.estadoPago}</span>
                </div>
                <div class="membership-card-body">
                    <p><strong>Tipo de Plan:</strong> ${membresia.tipoPlan}</p>
                    <p><strong>Próximo Vencimiento:</strong> ${new Date(membresia.fechaVencimiento).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>`;
    }

    function displayMisPagos(pagos) {
        if (pagos.length === 0) {
            contentArea.innerHTML = '<p>No tienes pagos registrados.</p>';
            return;
        }
        contentArea.innerHTML = `
            <div class="card">
                <h3>Historial de Pagos</h3>
                <table class="content-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Monto</th>
                            <th>Método</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagos.map(p => `
                            <tr>
                                <td>${p.id}</td>
                                <td>$${p.monto.toFixed(2)}</td>
                                <td>${p.metodo}</td>
                                <td>${new Date(p.fechaPago).toLocaleDateString()}</td>
                                <td><span class="status-badge status-verde">${p.estado}</span></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    }
    
    function displayTienda(productos) {
        contentArea.innerHTML = `
            <div class="card">
                <h3>Productos en Tienda</h3>
                <div class="market-grid">
                    ${productos.filter(p => p.activo).map(p => `
                        <div class="product-card market-view">
                            <div class="product-info">
                                <h4>${p.nombre}</h4>
                                <p class="product-price">$${p.precioVenta.toFixed(2)}</p>
                            </div>
                        </div>`).join('')}
                </div>
            </div>`;
    }
    
    function getSectionTitle(section) {
        const titles = { perfil: 'Mi Perfil', membresia: 'Mi Membresía', pagos: 'Mis Pagos', tienda: 'Tienda' };
        return titles[section] || 'Dashboard';
    }
});