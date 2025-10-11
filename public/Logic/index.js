document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const messageElement = document.getElementById('message');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    const API_LOGIN_URL = 'https://goldgymapi-3.onrender.com/api/auth/login';

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        submitButton.disabled = true;
        submitButton.textContent = 'Iniciando...';
        hideMessage();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        try {
            const response = await fetch(API_LOGIN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Credenciales incorrectas.');
            }

            // Guardamos todos los datos recibidos de la API en la sesión
            sessionStorage.setItem('authToken', data.token);
            sessionStorage.setItem('username', data.username);
            sessionStorage.setItem('userRoles', JSON.stringify(data.roles || []));
            sessionStorage.setItem('clienteId', data.clienteId);
            
            const userRoles = data.roles || [];

            showMessage('¡Éxito! Redirigiendo...', 'success');
            
            setTimeout(() => {
                redirectToDashboard(userRoles);
            }, 1000);

        } catch (error) {
            console.error('Error de inicio de sesión:', error);
            showMessage(error.message, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Iniciar Sesión';
        }
    });

    function redirectToDashboard(roles) {
        if (roles.includes('ADMINISTRADOR')) {
            window.location.href = 'dashboardadmin.html';
        } else if (roles.includes('EMPLEADO')) {
            window.location.href = 'dashboardempleado.html';
        } else if (roles.includes('CLIENTE')) {
            window.location.href = 'dashboardcliente.html';
        } else {
            showMessage('El usuario no tiene un rol válido para acceder.', 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Iniciar Sesión';
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