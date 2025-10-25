document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const messageElement = document.getElementById('message');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    // 📢 CORRECCIÓN CLAVE: Definir la BASE y el PATH por separado
    const API_BASE_URL = 'https://goldgymapi-3.onrender.com/api';
    const LOGIN_PATH = '/auth/login'; // El endpoint real de autenticación
    const FULL_LOGIN_URL = API_BASE_URL + LOGIN_PATH; // URL completa: .../api/auth/login

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        submitButton.disabled = true;
        submitButton.textContent = 'Iniciando...';
        hideMessage();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        try {
            // 📢 USO DE LA URL COMPLETA
            const response = await fetch(FULL_LOGIN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            // Si el backend no devuelve un JSON válido o la estructura no tiene 'message', 
            // intentamos leerlo como JSON y si no, usamos el estado de la respuesta.
            let data;
            try {
                data = await response.json();
            } catch (e) {
                // Si la respuesta no es JSON (ej. error 404/500 simple), creamos un objeto vacío
                data = { message: `Error ${response.status}: ${response.statusText}` };
            }
            
            console.log('Respuesta de la API:', data);
            
            if (!response.ok) {
                throw new Error(data.message || 'Error de autenticación, verifica el servidor.');
            }

            // Guardamos todos los datos recibidos de la API en la sesión
            sessionStorage.setItem('authToken', data.token);
            sessionStorage.setItem('username', data.username);
            sessionStorage.setItem('userRoles', JSON.stringify(data.roles || []));
            // Asegúrate de que tu backend envíe el clienteId, si no lo hace, será "undefined"
            sessionStorage.setItem('clienteId', data.clienteId); 
            
            const userRoles = data.roles || [];

            showMessage('¡Éxito! Redirigiendo...', 'success');
            
            setTimeout(() => {
                redirectToDashboard(userRoles);
            }, 1000);

        } catch (error) {
            console.error('Error de inicio de sesión:', error);
            // Mostrar error detallado o genérico
            showMessage(error.message.includes('401') ? 'Credenciales incorrectas.' : `Error: ${error.message}`, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Iniciar Sesión';
        }
    });

    function redirectToDashboard(roles) {
        if (roles.includes('ADMINISTRADOR')) {
            window.location.href = 'dashboardadmin.html';
        } else if (roles.includes('EMPLEADO')) {
            window.location.href = 'public/dashboardEmpleado.html';
        } else if (roles.includes('CLIENTE')) {
            window.location.href = 'dashboardcliente.html';
        } else {
            showMessage('El usuario no tiene un rol válido para acceder.', 'error');
            // No deshabilitamos el botón aquí, ya que el error se muestra en el catch
        }
    }

    function showMessage(msg, type) {
        messageElement.textContent = msg;
        messageElement.className = type;
        messageElement.style.display = 'block';
    }

    function hideMessage() {
        messageElement.style.display = 'none';
        messageElement.textContent = '';
    }
});