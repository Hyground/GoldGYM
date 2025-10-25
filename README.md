# 🚀 GoldGYM Dashboard de Gestión (Frontend)

Este repositorio contiene el código fuente del panel de control web (`Dashboard`) desarrollado para la administración y gestión de clientes, empleados, membresías, inventario (POS) y pagos del gimnasio GoldGYM. La aplicación es un **SPA (Single Page Application)** construida con Vanilla JavaScript, HTML5 y CSS, que interactúa con una API RESTful externa.

---

## 🔗 Entornos y Despliegue

| Entorno | URL |
| :--- | :--- |
| **Frontend Desplegado** | **`https://goldgymaguacatan.web.app/`** |
| **API Backend** | `https://goldgymapi-3.onrender.com/api` |

---

## 🎯 Características Principales

* **Arquitectura Modular:** Lógica separada en archivos JS para cada módulo (`clientes.js`, `pagos.js`, `ventas.js`, etc.).
* **Autenticación Basada en Roles:** Redirección automática a diferentes *dashboards* según el rol (`ADMINISTRADOR`, `CLIENTE`).
* **Gestión de Entidades:** CRUD simulado para Clientes, Empleados y Administradores, con control de permisos.
* **Inventario y POS:** Módulo de gestión de productos y punto de venta con lógica de carrito.
* **Gestión de Pagos:** Panel visual para el estado de pago de los clientes (rojo, amarillo, verde).

---

## 📁 Estructura del Proyecto

El proyecto sigue esta estructura de carpetas, con la raíz en `/GOLGYM`:

/GOLGYM (RAÍZ DEL PROYECTO) ├── index.html # Página principal / Login ├── dashboardadmin.html # Dashboard del Administrador ├── dashboardcliente.html # Dashboard del Cliente ├── /Logic # Contiene todo el JavaScript │ ├── dashboardadmin.js # Lógica del Admin (Funciones de tabla, Modales, CRUD) │ ├── dashboardcliente.js # Lógica del Cliente (Perfil, Membresía, Tienda) │ └── index.js # Lógica de Autenticación y Redirección └── /Styles # Hojas de estilo y diseño

* **Arquitectura Modular:**
* **Autenticación Basada en Roles:** Redirección automática a diferentes *dashboards* según el rol (`ADMINISTRADOR`, `CLIENTE`).
* **Gestión de Entidades:** CRUD simulado para Clientes, Empleados y Administradores, con control de permisos.
* **Inventario y POS:** Módulo de gestión de productos y punto de venta con lógica de carrito.
* **Gestión de Pagos:** Panel visual para el estado de pago de los clientes (rojo, amarillo, verde).

* 🤝 Contribución
* Si encuentras bugs o tienes sugerencias de mejora, por favor abre un Issue en este repositorio.

