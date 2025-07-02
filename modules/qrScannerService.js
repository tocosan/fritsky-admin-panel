// modules/qrScannerService.js
// Asegúrate de tener la librería Html5QrcodeScanner disponible globalmente o impórtala si usas un bundler.
// Si la cargas con un <script> en index.html, estará disponible globalmente.
import { mostrarMensaje } from './utils.js'; // Importamos la función de utilidad
// --- Variables del Módulo ---
let html5QrCodeScanner = null; // Instancia global del escáner
let scanMessageEl; // Referencia al elemento para mostrar mensajes del escáner
let clienteEncontradoInfoDiv;
let clienteEscaneadoEmailEl;
let clienteEscaneadoPuntosEl;
let puntosASumarDesdeQRInput; // Referencia al input para sumar puntos desde QR (obtenida vía setScannerDOMReferences)
let qrScannerElement; // Referencia al div donde se renderiza el escáner

// Variable para almacenar temporalmente la información del cliente escaneado
window.clienteEscaneadoParaSuma = null;

// Temporizador para el auto-ocultamiento de mensajes
let autoHideMessageTimer = null;

/**
 * Configura las referencias al DOM necesarias para el módulo del escáner.
 * DEBE llamarse después de que el DOM esté cargado y solo una vez.
 * @param {object} refs - Un objeto con las referencias del DOM.
 * @param {HTMLElement} refs.scanMessageEl - Elemento para mensajes de escaneo.
 * @param {HTMLElement} refs.qrScannerElement - Div donde se renderiza el escáner.
 * @param {HTMLElement} refs.clienteEncontradoInfoDiv - Div con info del cliente escaneado.
 * @param {HTMLElement} refs.clienteEscaneadoEmailEl - Elemento para mostrar email del cliente.
 * @param {HTMLElement} refs.clienteEscaneadoPuntosEl - Elemento para mostrar puntos del cliente.
 * @param {HTMLElement} refs.puntosASumarDesdeQRInput - Input para sumar puntos desde QR.
 */
export function setScannerDOMReferences({
    scanMessageEl: msgEl,
    qrScannerElement: qrEl,
    clienteEncontradoInfoDiv: infoDiv,
    clienteEscaneadoEmailEl: emailEl,
    puntosASumarDesdeQRInput: puntosInput,
    clienteEscaneadoPuntosEl: puntosEl
}) {
    // Asignamos las referencias DOM a las variables locales del módulo.
    scanMessageEl = msgEl;
    qrScannerElement = qrEl;
    clienteEncontradoInfoDiv = infoDiv;
    clienteEscaneadoEmailEl = emailEl;
    clienteEscaneadoPuntosEl = puntosEl;
    puntosASumarDesdeQRInput = puntosInput;
    

    // --- Verificación crítica de que las referencias se obtuvieron ---
    if (!scanMessageEl || !qrScannerElement || !clienteEncontradoInfoDiv || !clienteEscaneadoEmailEl || !clienteEscaneadoPuntosEl || !puntosASumarDesdeQRInput) {
        console.error("[SCANNER_SERVICE] ERROR CRÍTICO: No se pudieron asignar todas las referencias DOM necesarias en setScannerDOMReferences.");
        // Si esto falla, el escaneo no podrá actualizar la UI.
    } else {
        console.log("[SCANNER_SERVICE] Referencias DOM del escáner asignadas correctamente.");
    }
}

/**
 * Configura y muestra un mensaje, programando su auto-ocultamiento.
 * @param {HTMLElement} element - El elemento donde mostrar el mensaje.
 * @param {string} message - El mensaje a mostrar.
 * @param {boolean} isError - Si el mensaje es de error (para estilos).
 * @param {number} [duration=3000] - Duración en milisegundos antes de ocultar.
 */
function mostrarMensajeConAutoOcultamiento(element, message, isError, duration = 3000) {
    if (!element) {
        console.error("Elemento de mensaje no disponible para mostrar:", message);
        return;
    }
    // Limpiar cualquier temporizador anterior para evitar ocultamientos múltiples
    if (autoHideMessageTimer) {
        clearTimeout(autoHideMessageTimer);
    }

    // Mostrar el mensaje
    mostrarMensaje(element, message, isError); // Usamos la función importada

    // Programar el ocultamiento
    autoHideMessageTimer = setTimeout(() => {
        mostrarMensaje(element, "", false); // Limpia el mensaje
        autoHideMessageTimer = null; // Limpiar la referencia al temporizador
    }, duration);
}


/**
 * Inicializa el escáner QR, deteniendo uno previo si existe.
 * @param {function} onScanSuccess - Callback para cuando se escanea un QR válido.
 * @param {function} onScanFailure - Callback para errores de escaneo.
 */
export function initializeScanner(onScanSuccess, onScanFailure) {
    // Detenemos y limpiamos cualquier escáner anterior antes de inicializar uno nuevo
    if (html5QrCodeScanner) {
        html5QrCodeScanner.stop().then(() => {
            console.log("[SCANNER_SERVICE] Escáner QR existente detenido.");
            html5QrCodeScanner.clear();
        }).catch(error => {
            console.log("[SCANNER_SERVICE] Error al detener escáner existente:", error);
        });
        html5QrCodeScanner = null;
    }
    console.log("[SCANNER_SERVICE] Intentando inicializar escáner...");
    // Usamos un pequeño timeout para asegurar que el DOM esté completamente listo y la sección sea visible.
    setTimeout(() => {
        if (!qrScannerElement) {
            console.error("[SCANNER_SERVICE] Elemento #qrScannerElement no está configurado.");
            mostrarMensaje(scanMessageEl, "Error: Contenedor del escáner no configurado.", true);
            return;
        }

        try {
            // Crear una nueva instancia del escáner
            html5QrCodeScanner = new Html5QrcodeScanner(qrScannerElement.id, {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            });

            // Renderizar el escáner. Los handlers los definimos aquí pero los pasamos como callbacks.
            html5QrCodeScanner.render(
                (decodedText, decodedResult) => {
                    // Procesamos el texto decodificado
                    if (decodedText && typeof decodedText === 'string' && decodedText.startsWith("fritsky_user:")) {
                        const parts = decodedText.split(':');
                        if (parts.length === 2) {
                            const clienteUid = parts[1];
                            console.log(`[SCANNER_SERVICE] UID del cliente extraído: ${clienteUid}`);
                            stopScanner(); // Detenemos el escáner una vez que tenemos el UID.
                            onScanSuccess(clienteUid); // Llamamos al callback de éxito.
                        } else {
                            mostrarMensaje(scanMessageEl, "Formato de QR inválido. Escanea el código correcto.", true);
                            if (onScanFailure) onScanFailure("Formato de QR inválido");
                        }
                    } else {
                        mostrarMensaje(scanMessageEl, "Formato de QR inválido. Escanea el código correcto.", true);
                        if (onScanFailure) onScanFailure("Formato de QR inválido");
                    }
                },
                (error) => { // Handler de fallo
                    // La librería a veces reporta "no se pudo detectar" que es normal al inicio.
                    // Solo actuamos si hay un error REALMENTE disruptivo.
                    if (onScanFailure) onScanFailure(error);
                }
            );
            console.log("[SCANNER_SERVICE] Escáner iniciado exitosamente.");

        } catch (e) {
            console.error("[SCANNER_SERVICE] Fallo al inicializar Html5QrcodeScanner:", e);
            mostrarMensaje(scanMessageEl, "No se pudo iniciar la cámara. Verifique permisos y estado.", true);
            if (onScanFailure) onScanFailure(e);
        }

    }, 100); // Un pequeño timeout para asegurar que el elemento del DOM está listo.
}

/**
Detiene la instancia del escáner QR y limpia la interfaz.
*/
export function stopScanner() {
    // VERIFICAMOS si html5QrCodeScanner existe Y si tiene la función stop
    if (html5QrCodeScanner && typeof html5QrCodeScanner.stop === 'function') {
        html5QrCodeScanner.stop().then(() => {
            console.log("[SCANNER_SERVICE] Escáner QR detenido.");
            html5QrCodeScanner.clear(); // Limpia la interfaz del escáner
            html5QrCodeScanner = null; // Libera la instancia
        }).catch(error => {
            console.error("[SCANNER_SERVICE] Error al detener el escáner:", error);
            html5QrCodeScanner = null; // Asegurarnos de que sea null en caso de error
        });
    } else {
        // Si no existe o no tiene la función stop, simplemente nos aseguramos de que la variable sea null.
        if (html5QrCodeScanner !== null) {
            html5QrCodeScanner = null;
        }
    }
}

/**
Muestra la información de un cliente escaneado en la UI del escáner.
@param {object} clienteData - Datos del cliente (id, email, puntos).
*/
export function mostrarInfoClienteEscaneado(clienteData) {
    // --- Verificación de que las referencias DOM están listas y clienteData es válido ---
    if (!clienteEncontradoInfoDiv || !clienteEscaneadoEmailEl || !clienteEscaneadoPuntosEl) {
        console.error("[SCANNER_SERVICE] No se pudieron actualizar las referencias DOM para mostrar información del cliente. Las referencias no están disponibles.");
        return; // No podemos actualizar la UI si las referencias no están disponibles.
    }
    if (!clienteData) {
        console.error("[SCANNER_SERVICE] No se recibieron datos del cliente para mostrar.");
        return; // No hay datos para mostrar.
    }
    // Añadimos una verificación más específica para campos críticos.
    if (!clienteData.id || !clienteData.email) {
        console.error("[SCANNER_SERVICE] Los datos del cliente recibidos no son válidos (falta ID o email).", clienteData);
        return;
    }

    // Si todo está bien, procedemos a actualizar la UI
    window.clienteEscaneadoParaSuma = clienteData; // Guardamos el cliente escaneado en el objeto global.

    clienteEncontradoInfoDiv.style.display = 'block';
    clienteEscaneadoEmailEl.textContent = clienteData.email || 'No disponible';
    clienteEscaneadoPuntosEl.textContent = clienteData.puntos || 0;

    // Limpiamos el input de puntos y preparamos para la siguiente suma.
    if (puntosASumarDesdeQRInput) puntosASumarDesdeQRInput.value = '';
    
    // Limpiar mensajes anteriores y temporizadores.
    if (scanMessageEl) {
        mostrarMensaje(scanMessageEl, "", false);
    }
    if (autoHideMessageTimer) {
        clearTimeout(autoHideMessageTimer);
        autoHideMessageTimer = null;
    }
}

/**
Oculta la información del cliente escaneado y limpia la UI relacionada.
*/
export function ocultarInfoClienteEscaneado() {
    window.clienteEscaneadoParaSuma = null; // Limpiamos el cliente global.
    if (clienteEncontradoInfoDiv) clienteEncontradoInfoDiv.style.display = 'none';
    if (puntosASumarDesdeQRInput) puntosASumarDesdeQRInput.value = ''; // Limpiar el input de puntos.

    // Limpiar el mensaje y el temporizador si están activos.
    if (scanMessageEl) {
        mostrarMensaje(scanMessageEl, "", false); // Limpiar el mensaje
    }
    if (autoHideMessageTimer) {
        clearTimeout(autoHideMessageTimer);
        autoHideMessageTimer = null;
    }
}