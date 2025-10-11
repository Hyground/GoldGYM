document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const messageElement = document.getElementById('message');

    // **IMPORTANTE**: Reemplaza esta URL con la ruta real de tu API de Login
    const API_LOGIN_URL = 'http://localhost:8080/api/auth/login';

    // Función para mostrar mensajes de estado
    function showMessage(msg, type) {
        messageElement.textContent = msg;
        messageElement.className = type; // Asigna 'error' o 'success'
        messageElement.style.display = 'block';
    }
    
    // Función central para determinar la redirección
    function redirectToDashboard(roles) {
        // Establecer un orden de prioridad: ADMIN > EMPLEADO > CLIENTE
        if (roles.includes('ADMINISTRADOR')) {
            window.location.href = 'dashboardadmin.html';
        } else if (roles.includes('EMPLEADO')) {
            window.location.href = 'dashboardempleado.html';
        } else if (roles.includes('CLIENTE')) {
            window.location.href = 'dashboardcliente.html';
        } else {
            // Caso de seguridad: si no tiene un rol reconocido
            showMessage('Inicio de sesión exitoso, pero el usuario no tiene un rol válido para acceder.', 'error');
            // Opcional: Cerrar sesión forzosamente si el rol es desconocido
            sessionStorage.removeItem('authToken');
        }
    }


    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageElement.style.display = 'none'; // Ocultar mensaje anterior

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Validar que los campos no estén vacíos (aunque HTML 'required' ayuda)
        if (!username || !password) {
            showMessage('Por favor, ingresa tu usuario y contraseña.', 'error');
            return;
        }

        try {
            // 1. Petición a la API
            const response = await fetch(API_LOGIN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            // 2. Manejo de la respuesta
            if (response.ok) {
                const data = await response.json();
                
                const token = data.token;
                // **CAMBIO IMPORTANTE**: Ahora esperamos una lista de roles (data.roles)
                const roles = data.roles || []; 

                // Almacenar el token y los roles. Almacenamos el token para seguridad y los roles para la interfaz.
                sessionStorage.setItem('authToken', token);
                sessionStorage.setItem('username', username);
                sessionStorage.setItem('userRoles', JSON.stringify(roles)); // Guardar la lista de roles como string

                showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
                
                // **3. Redirección basada en Rol**
                setTimeout(() => {
                    redirectToDashboard(roles);
                }, 1000); // Redirige después de 1 segundo
                
            } else {
                // Manejar errores como credenciales inválidas (ej. 401 Unauthorized)
                const errorData = await response.json();
                const errorMessage = errorData.message || 'Credenciales inválidas. Intenta de nuevo.';
                showMessage(errorMessage, 'error');
            }

        } catch (error) {
            console.error('Error de conexión:', error);
            showMessage('Error de conexión con el servidor. Por favor, verifica tu red o la URL de la API.', 'error');
        }
    });
});