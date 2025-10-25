// --- Lógica de Ventas (POS) ---

// Dependencias
// API_BASE_URL, token, userRoles, loggedInUserId, fetchAPI, contentArea, productsCache (compartido?)

let cart = []; // Estado local del carrito

async function setupPOSInterface() {
    console.log("[Ventas] Configurando interfaz POS...");
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
            <div class="cart-items"><p class="empty-cart">El carrito está vacío.</p></div>
            <div class="cart-summary">
                <div class="total"><span>Total:</span><span id="cart-total">Q0.00</span></div>
                <button id="checkout-btn" class="btn-accent full-width" disabled>Finalizar Compra</button>
            </div>
        </div>
    </div>`;

    try {
         // Re-usar caché si existe y tiene datos, sino cargar
         if (!productsCache || productsCache.length === 0) {
             console.log("[Ventas] Caché de productos vacío, cargando...");
             productsCache = await fetchAPI('/productos'); // Cargar todos los productos
         } else {
              console.log("[Ventas] Usando caché de productos existente.");
         }

        // Filtrar solo activos y con stock para el POS
        const posProducts = productsCache.filter(p => p.activo && p.stockCantidad > 0);
        console.log(`[Ventas] Productos disponibles para POS: ${posProducts.length}`);

        renderPOSProductGrid(posProducts); // Renderizar solo los disponibles

        const checkoutBtn = document.getElementById('checkout-btn');
        const posSearchInput = document.getElementById('pos-search');

        if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout); else console.error("#checkout-btn no encontrado");
        if (posSearchInput) posSearchInput.addEventListener('input', filterPOSProducts); else console.error("#pos-search no encontrado");

        updateCartDisplay(); // Actualizar display inicial del carrito
        console.log("[Ventas] Interfaz POS configurada.");
    } catch (error) {
        console.error("[Ventas] Error configurando POS:", error);
        showError(contentArea, "Error al cargar productos para la venta", error);
    }
}

function filterPOSProducts() {
    const searchInput = document.getElementById('pos-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    console.log(`[Ventas] Filtrando productos POS con término: "${searchTerm}"`);

    // Filtrar desde el caché completo, aplicando filtros POS aquí
    const filtered = productsCache.filter(p =>
        p.activo && p.stockCantidad > 0 && // Filtro base POS
        ((p.nombre && p.nombre.toLowerCase().includes(searchTerm)) ||
         (p.categoria && p.categoria.toLowerCase().includes(searchTerm)))
    );
    console.log(`[Ventas] Productos POS filtrados: ${filtered.length}`);
    renderPOSProductGrid(filtered);
}

function renderPOSProductGrid(products) {
    const grid = contentArea.querySelector('.product-grid'); // Buscar dentro de contentArea
    if (!grid) { console.error("[Ventas] Contenedor .product-grid no encontrado."); return; }
    console.log(`[Ventas] Renderizando ${products.length} productos en cuadrícula POS.`);

    if (products.length === 0) {
        grid.innerHTML = '<p>No se encontraron productos disponibles con ese filtro.</p>'; return;
    }

    grid.innerHTML = products.map(p => {
        let icon = 'inventory_2';
        if (p.categoria === 'SUPLEMENTO') icon = 'fitness_center';
        else if (p.categoria === 'BEBIDA') icon = 'local_drink';
        else if (p.categoria === 'SNACK') icon = 'fastfood';
        else if (p.categoria === 'EQUIPO') icon = 'style';
        return `
        <div class="product-card pos-view" data-id="${p.id}" title="Añadir ${p.nombre || 'Producto'} al carrito">
            <div class="product-image"><i class="material-icons product-icon">${icon}</i></div>
            <div class="product-info">
                 <h4>${p.nombre || 'Sin Nombre'}</h4>
                 <p class="product-price">Q${Number(p.precioVenta || 0).toFixed(2)}</p>
                 <p class="stock-info pos">Stock: ${p.stockCantidad ?? 'N/A'}</p>
            </div>
        </div>`;
    }).join('');
}


function addToCart(product) {
    if (!product || product.stockCantidad <= 0) {
        alert(`"${product?.nombre || 'Producto'}" ya no tiene stock.`); return;
    }
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        if (existingItem.cantidad >= product.stockCantidad) {
            alert(`No hay más stock disponible para "${product.nombre}".`); return;
        }
        existingItem.cantidad++;
        console.log(`[Ventas] Cantidad aumentada para ${product.nombre} a ${existingItem.cantidad}`);
    } else {
        cart.push({ ...product, cantidad: 1 });
        console.log(`[Ventas] ${product.nombre} añadido al carrito.`);
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItemsContainer = contentArea?.querySelector('.cart-items');
    const cartTotalSpan = contentArea?.querySelector('#cart-total');
    const checkoutBtn = document.getElementById('checkout-btn'); // Buscar por ID global
    if (!cartItemsContainer || !cartTotalSpan || !checkoutBtn) return; // Salir si no estamos en la vista POS

    console.log("[Ventas] Actualizando display del carrito...");
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
        </div>`).join('');
    }
    const total = cart.reduce((sum, item) => sum + (Number(item.precioVenta || 0) * item.cantidad), 0);
    cartTotalSpan.textContent = `Q${total.toFixed(2)}`;
    console.log(`[Ventas] Total carrito actualizado: Q${total.toFixed(2)}`);

    // Re-añadir listeners a botones +/-
    cartItemsContainer.querySelectorAll('.quantity-decrease').forEach(b => b.addEventListener('click', () => updateQuantity(b.dataset.id, -1)));
    cartItemsContainer.querySelectorAll('.quantity-increase').forEach(b => b.addEventListener('click', () => updateQuantity(b.dataset.id, 1)));

    checkoutBtn.disabled = cart.length === 0; // Habilitar/deshabilitar
}

function updateQuantity(productId, change) {
    console.log(`[Ventas] Actualizando cantidad ID ${productId}, cambio: ${change}`);
    const itemIndex = cart.findIndex(i => i.id == productId);
    if (itemIndex === -1) return;
    const item = cart[itemIndex];
    // Necesitamos el stock actual del caché, NO del item (que podría ser viejo)
    const productInStock = productsCache.find(p => p.id == productId);
    const currentStock = productInStock ? productInStock.stockCantidad : 0;

    if (change > 0) {
        if (item.cantidad + change > currentStock) {
            alert(`No hay más stock disponible para "${item.nombre}". Stock actual: ${currentStock}`);
            return;
        }
    }
    item.cantidad += change;
    if (item.cantidad <= 0) {
        console.log(`[Ventas] Quitando ${item.nombre} del carrito.`);
        cart.splice(itemIndex, 1);
    } else {
        console.log(`[Ventas] Nueva cantidad ${item.nombre}: ${item.cantidad}`);
    }
    updateCartDisplay();
}

async function handleCheckout() {
    if (cart.length === 0) { alert('El carrito está vacío.'); return; }
    const checkoutBtn = document.getElementById('checkout-btn');
    if (!checkoutBtn) return;

    checkoutBtn.disabled = true; checkoutBtn.textContent = 'Procesando...';
    console.log("[Ventas] Iniciando checkout...");

    let usuarioIdVenta = loggedInUserId ? parseInt(loggedInUserId) : null;
    if (!usuarioIdVenta) {
        console.warn("ID de usuario logueado no encontrado. Venta sin usuario asociado.");
        // Opcional: Buscar ID por username si es crucial tenerlo
    }

    const totalVenta = cart.reduce((sum, item) => sum + (Number(item.precioVenta || 0) * item.cantidad), 0);
    const detallesVenta = cart.map(item => ({
        productoId: item.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioVenta,
        subtotal: Number(item.precioVenta || 0) * item.cantidad
    }));

    const ventaRequest = {
        clienteId: null, // Venta genérica
        usuarioId: usuarioIdVenta,
        detalles: detallesVenta,
        total: totalVenta,
        notas: "Venta POS"
    };
    console.log("[Ventas] Enviando petición:", ventaRequest);

    try {
        // Usa fetchAPI para manejo de errores centralizado
        await fetchAPI('/ventas', { method: 'POST', body: ventaRequest });
        alert('Venta realizada con éxito!');
        cart = []; // Vaciar carrito local
        updateCartDisplay(); // Actualizar UI carrito

        // Recargar caché de productos y re-renderizar POS para stock actualizado
        console.log("[Ventas] Recargando productos post-venta...");
        productsCache = await fetchAPI('/productos');
        const posProducts = productsCache.filter(p => p.activo && p.stockCantidad > 0);
        renderPOSProductGrid(posProducts);

    } catch (error) {
        console.error("[Ventas] Error en checkout:", error);
        alert(`Error al finalizar la venta: ${error.message || 'Error desconocido'}`);
    } finally {
        checkoutBtn.disabled = cart.length === 0;
        checkoutBtn.textContent = 'Finalizar Compra';
    }
}
