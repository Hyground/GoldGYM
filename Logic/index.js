document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');

    const messageElement = document.getElementById('message');



    // **IMPORTANTE**: Reemplaza esta URL con la ruta real de tu API de Login

    const API_LOGIN_URL = 'http://localhost:8080/api/auth/login';

    // Por ejemplo: 'http://tu-dominio.com/api/v1/usuarios/login'



    // Función para mostrar mensajes de estado

    function showMessage(msg, type) {

        messageElement.textContent = msg;

        messageElement.className = type; // Asigna 'error' o 'success'

        messageElement.style.display = 'block';

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

               

                // Asumiendo que el token se devuelve en la respuesta

                const token = data.token;

               

                // Almacenar el token para futuras peticiones (usamos sessionStorage por simplicidad)

                sessionStorage.setItem('authToken', token);

                sessionStorage.setItem('username', username);

                sessionStorage.setItem('userRole', data.rol); // Guardar el rol del usuario



                showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');

               

                // **3. Redireccionar al Dashboard**

                // Tendrás que crear un archivo 'dashboard.html' en el siguiente paso.

                setTimeout(() => {

                    window.location.href = 'dashboardadmin.html';

                }, 1000); // Redirige después de 1 segundo

               

            } else {

                // Manejar errores como credenciales inválidas (ej. 401 Unauthorized)

                const errorData = await response.json();

                const errorMessage = errorData.message || 'Credenciales inválidas. Intenta de nuevo.';

                showMessage(errorMessage, 'error');

            }



        } catch (error) {

            console.error('Error de conexión:', error);

            // El error 'fetch' se dispara por problemas de red o CORS, no por errores HTTP (4xx, 5xx).

            showMessage('Error de conexión con el servidor. Por favor, verifica tu red o la URL de la API.', 'error');

        }

    });

});