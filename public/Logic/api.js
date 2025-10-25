// --- Lógica de API ---
const API_BASE_URL = 'http://localhost:8080/api'; // API Local
const token = sessionStorage.getItem('authToken');

/**
 * Realiza una petición fetch a la API con manejo de errores y autenticación.
 * @param {string} endpoint - El endpoint de la API (ej: '/clientes').
 * @param {object} options - Opciones de Fetch (method, body, headers).
 * @returns {Promise<any>} - La respuesta JSON parseada o null si es 204.
 * @throws {Error} - Si la respuesta no es OK o hay un error de red/parseo.
 */
async function fetchAPI(endpoint, options = {}) {
    console.log(`[fetchAPI] ${options.method || 'GET'} ${endpoint}`); // Log inicio fetch

    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    const config = {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    };

    // Convertir body a JSON si es un objeto
    if (config.body && typeof config.body === 'object') {
        try {
            config.body = JSON.stringify(config.body);
             console.log(`[fetchAPI] Body:`, config.body); // Log body JSON
        } catch (stringifyError) {
            console.error("[fetchAPI] Error al convertir body a JSON:", stringifyError);
            throw new Error("Error interno al preparar la solicitud.");
        }
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
         console.log(`[fetchAPI] Respuesta ${endpoint}: Status ${response.status}`); // Log status respuesta

        // Manejar éxito sin contenido (Ej: DELETE)
        if (response.status === 204) {
             console.log(`[fetchAPI] ${endpoint} -> 204 No Content`);
             return null; // Éxito sin cuerpo
        }

        // Intentar leer el cuerpo de la respuesta (puede ser JSON o texto de error)
        const responseText = await response.text();

        // Si la respuesta NO fue exitosa (status >= 400)
        if (!response.ok) {
            let errorJson = null;
            let errorMessage = `Error ${response.status}`;
            try {
                // Intentar parsear el error como JSON (muchas APIs devuelven detalles así)
                errorJson = JSON.parse(responseText);
                errorMessage = errorJson.message || errorJson.error || JSON.stringify(errorJson);
                 console.error(`[fetchAPI] Error ${response.status} (JSON):`, errorJson);
            } catch (parseError) {
                // Si no es JSON, usar el texto plano (o statusText si no hay texto)
                errorMessage = responseText || response.statusText;
                 console.error(`[fetchAPI] Error ${response.status} (Texto): ${errorMessage}`);
            }
             // Lanzar un error estructurado
            const error = new Error(errorMessage);
            error.status = response.status;
             error.details = errorJson || responseText; // Guardar detalles
             throw error;
        }

        // Si la respuesta fue exitosa pero sin texto (poco común para GET/POST con respuesta)
        if (!responseText) {
             console.log(`[fetchAPI] ${endpoint} -> Respuesta OK pero vacía.`);
             return null; // O un objeto vacío {} si se espera algo
        }

        // Intentar parsear la respuesta exitosa como JSON
        try {
            const data = JSON.parse(responseText);
             // console.log(`[fetchAPI] Datos recibidos de ${endpoint}:`, data); // Log datos (puede ser muy verboso)
             return data;
        } catch (parseError) {
             console.error(`[fetchAPI] Error al parsear JSON de respuesta exitosa de ${endpoint}:`, parseError, `Texto: ${responseText}`);
             throw new Error("Error al procesar la respuesta del servidor (formato inesperado).");
        }

    } catch (error) {
         // Capturar errores de red (Failed to fetch) o errores lanzados arriba
         console.error(`[fetchAPI] Error general en petición a ${endpoint}:`, error);

         // Mejorar mensaje para errores de red
         if (error instanceof TypeError && error.message.includes("fetch")) {
             throw new Error("Error de red: No se pudo conectar con la API.");
         }
         // Re-lanzar el error (ya formateado si vino del !response.ok)
         throw error;
    }
}
