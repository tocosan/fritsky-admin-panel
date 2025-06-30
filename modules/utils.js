// modules/utils.js

/**
 * Muestra un mensaje en un elemento del DOM, aplicando clases para estilo.
 * @param {HTMLElement} elemento - El elemento del DOM donde mostrar el mensaje.
 * @param {string} texto - El contenido del mensaje.
 * @param {boolean} [esError=false] - Si el mensaje es de error o informativo.
 */
export function mostrarMensaje(elemento, texto, esError = false) {
    if (elemento) {
        elemento.textContent = texto;
        elemento.classList.remove('error-message', 'message', 'visible'); // Limpia clases anteriores
        if (texto) {
            elemento.classList.add(esError ? 'error-message' : 'message', 'visible');
        }
    }
}

/**
 * Proporciona mensajes de error comprensibles para códigos de error de Firebase.
 * @param {object} error - El objeto de error de Firebase.
 * @returns {string} - Un mensaje de error legible para el usuario.
 */
export function obtenerMensajeErrorFirebase(error) {
    console.error("Código de error Firebase:", error.code, "Mensaje:", error.message); 
    switch (error.code) {
        case 'auth/email-already-in-use': return 'Este correo electrónico ya está en uso. Intenta iniciar sesión o usa uno diferente.';
        case 'auth/invalid-email': return 'El formato del correo electrónico no es válido.';
        case 'auth/operation-not-allowed': return 'Esta operación no está permitida.';
        case 'auth/weak-password': return 'La contraseña es demasiado débil. Usa una más segura.';
        case 'auth/user-not-found': return 'No se encontró ningún usuario con este correo electrónico.';
        case 'auth/wrong-password': return 'La contraseña ingresada es incorrecta.';
        case 'auth/invalid-credential': return 'Correo electrónico o contraseña incorrectos. Por favor, verifica tus datos.';
        case 'auth/too-many-requests': return 'Demasiados intentos de inicio de sesión. Espera un momento o inténtalo más tarde.';
        case 'auth/network-request-failed': return 'Fallo en la conexión. Revisa tu conexión a internet.';
        case 'auth/user-disabled': return 'Esta cuenta de usuario ha sido deshabilitada.';
        case 'auth/popup-blocked': return 'La ventana emergente se bloqueó. Permite las ventanas emergentes para este sitio.';
        case 'auth/cancelled-popup-request': return 'La acción de inicio de sesión fue cancelada.';
        case 'auth/user-mismatch': return 'No se pudo restablecer la contraseña. El usuario no coincide con el correo proporcionado.';
        case 'auth/session-cookie-expired': return 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.';
        default: return `Ocurrió un error desconocido: ${error.message || error.code}`;
    }
}
