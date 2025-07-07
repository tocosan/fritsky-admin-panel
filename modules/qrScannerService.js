// qrScannerService.js

import { mostrarMensaje } from './utils.js'; // Importamos la función de utilidad

// --- Variables GLOBALES del Módulo ---
let html5QrCodeScanner = null;
let scanMessageEl;
let qrScannerElement;
let clienteEncontradoInfoDiv;
let clienteEscaneadoEmailEl;
let clienteEscaneadoPuntosEl;
let puntosASumarDesdeQRInput;
let escanearSumarPuntosForm;
let escanearDescontarPuntosForm;
let escanearSumarPuntosMessage;
let escanearDescontarPuntosMessage;
let puntosADescontarDesdeQRInput;
let sumarPuntosFormContainer; // Contenedor para el formulario de sumar puntos
let descontarPuntosFormContainer; // Contenedor para el formulario de descontar puntos

window.clienteEscaneadoParaSuma = null; // Variable global para el cliente escaneado

// Temporizador para el auto-ocultamiento de mensajes
let autoHideMessageTimer = null;

/**
 * Configura las referencias al DOM necesarias para el módulo del escáner.
 * @param {object} refs - Un objeto con las referencias del DOM.
 */
export function setScannerDOMReferences({
    scanMessageEl: refScanMessageEl,
    qrScannerElement: refQrScannerElement,
    clienteEncontradoInfoDiv: refClienteEncontradoInfoDiv,
    clienteEscaneadoEmailEl: refClienteEscaneadoEmailEl,
    clienteEscaneadoPuntosEl: refClienteEscaneadoPuntosEl,
    puntosASumarDesdeQRInput: refPuntosASumarDesdeQRInput,
    escanearSumarPuntosForm: refEscanearSumarPuntosForm,
    escanearDescontarPuntosForm: refEscanearDescontarPuntosForm,
    escanearSumarPuntosMessage: refEscanearSumarPuntosMessage,
    escanearDescontarPuntosMessage: refEscanearDescontarPuntosMessage,
    puntosADescontarDesdeQRInput: refPuntosADescontarDesdeQRInput,
    sumarPuntosFormContainer: refSumarPuntosFormContainer,
    descontarPuntosFormContainer: refDescontarPuntosFormContainer
}) {
    // Asignamos a las variables GLOBALES del módulo
    scanMessageEl = refScanMessageEl;
    qrScannerElement = refQrScannerElement;
    clienteEncontradoInfoDiv = refClienteEncontradoInfoDiv;
    clienteEscaneadoEmailEl = refClienteEscaneadoEmailEl;
    clienteEscaneadoPuntosEl = refClienteEscaneadoPuntosEl;
    puntosASumarDesdeQRInput = refPuntosASumarDesdeQRInput;
    escanearSumarPuntosForm = refEscanearSumarPuntosForm;
    escanearDescontarPuntosForm = refEscanearDescontarPuntosForm;
    escanearSumarPuntosMessage = refEscanearSumarPuntosMessage;
    escanearDescontarPuntosMessage = refEscanearDescontarPuntosMessage;
    puntosADescontarDesdeQRInput = refPuntosADescontarDesdeQRInput;
    sumarPuntosFormContainer = refSumarPuntosFormContainer;
    descontarPuntosFormContainer = refDescontarPuntosFormContainer;

    if (!scanMessageEl || !qrScannerElement || !clienteEncontradoInfoDiv || !clienteEscaneadoEmailEl || !clienteEscaneadoPuntosEl || !puntosASumarDesdeQRInput || !escanearSumarPuntosForm || !escanearDescontarPuntosForm || !escanearSumarPuntosMessage || !escanearDescontarPuntosMessage || !puntosADescontarDesdeQRInput || !sumarPuntosFormContainer || !descontarPuntosFormContainer) {
        console.error("[SCANNER_SERVICE] ERROR CRÍTICO: No se pudieron asignar todas las referencias DOM necesarias en setScannerDOMReferences. Revise los IDs en index.html (incluyendo referencias de formularios y contenedores).");
    } else {
        console.log("[SCANNER_SERVICE] Referencias DOM del escáner asignadas correctamente.");
    }
}

/**
 * Configura y muestra un mensaje, programando su auto-ocultamiento.
 */
function mostrarMensajeConAutoOcultamiento(element, message, isError, duration = 3000) {
    if (!element) {
        console.error("Elemento de mensaje no disponible para mostrar:", message);
        return;
    }
    if (autoHideMessageTimer) {
        clearTimeout(autoHideMessageTimer);
    }
    mostrarMensaje(element, message, isError);
    autoHideMessageTimer = setTimeout(() => {
        mostrarMensaje(element, "", false);
        autoHideMessageTimer = null;
    }, duration);
}

/**
 * Inicializa el escáner QR, deteniendo uno previo si existe.
 * @param {function} onScanSuccess - Callback para cuando se escanea un QR válido.
 * @param {function} onScanFailure - Callback para errores de escaneo.
 */
export function initializeScanner(onScanSuccess, onScanFailure) {
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
    
    setTimeout(() => {
        if (!qrScannerElement) {
            console.error("[SCANNER_SERVICE] Elemento #qrScannerElement no está configurado.");
            if (scanMessageEl) mostrarMensaje(scanMessageEl, "Error: Contenedor del escáner no configurado.", true);
            return;
        }

        try {
            html5QrCodeScanner = new Html5QrcodeScanner(qrScannerElement.id, {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            });

            html5QrCodeScanner.render(
                (decodedText, decodedResult) => {
                    if (decodedText && typeof decodedText === 'string' && decodedText.startsWith("fritsky_user:")) {
                        const parts = decodedText.split(':');
                        if (parts.length === 2) {
                            const clienteUid = parts[1];
                            console.log(`[SCANNER_SERVICE] UID del cliente extraído: ${clienteUid}`);
                            stopScanner();
                            onScanSuccess(clienteUid);
                        } else {
                            if (scanMessageEl) mostrarMensaje(scanMessageEl, "Formato de QR inválido. Escanea el código correcto.", true);
                            if (onScanFailure) onScanFailure("Formato de QR inválido");
                        }
                    } else {
                        if (scanMessageEl) mostrarMensaje(scanMessageEl, "Formato de QR inválido. Escanea el código correcto.", true);
                        if (onScanFailure) onScanFailure("Formato de QR inválido");
                    }
                },
                (error) => {
                    if (onScanFailure) onScanFailure(error);
                }
            );
            console.log("[SCANNER_SERVICE] Escáner iniciado exitosamente.");

        } catch (e) {
            console.error("[SCANNER_SERVICE] Fallo al inicializar Html5QrcodeScanner:", e);
            if (scanMessageEl) mostrarMensaje(scanMessageEl, "No se pudo iniciar la cámara. Verifique permisos y estado.", true);
            if (onScanFailure) onScanFailure(e);
        }

    }, 100);
}

export function stopScanner() {
    if (html5QrCodeScanner && typeof html5QrCodeScanner.stop === 'function') {
        html5QrCodeScanner.stop().then(() => {
            console.log("[SCANNER_SERVICE] Escáner QR detenido.");
            html5QrCodeScanner.clear();
            html5QrCodeScanner = null;
        }).catch(error => {
            console.error("[SCANNER_SERVICE] Error al detener el escáner:", error);
            html5QrCodeScanner = null;
        });
    } else {
        if (html5QrCodeScanner !== null) {
            html5QrCodeScanner = null;
        }
    }
}


/**
Muestra la información de un cliente escaneado en la UI del escáner.
Al escanear, muestra los datos básicos del cliente, los botones de operación (sumar/restar)
y prepara la UI ocultando los formularios de entrada de puntos hasta que se seleccione una acción.
@param {object} clienteData - Datos del cliente (id, email, puntos).
*/
export function mostrarInfoClienteEscaneado(clienteData) {
    // Verificación de que las referencias DOM necesarias para MOSTRAR la información y los formularios están listas.
    if (!clienteEncontradoInfoDiv || !clienteEscaneadoEmailEl || !clienteEscaneadoPuntosEl || !sumarPuntosFormContainer || !descontarPuntosFormContainer) {
        console.error("[SCANNER_SERVICE] ERROR CRÍTICO: Las referencias DOM para mostrar info del cliente o los formularios no son válidas. Las variables globales podrían estar mal asignadas.");
        return; // Salimos si las referencias para mostrar info son inválidas.
    }
    
    // Verificamos que los datos del cliente sean válidos.
    if (!clienteData || !clienteData.id || !clienteData.email) {
        console.error("[SCANNER_SERVICE] Los datos del cliente recibidos no son válidos (falta ID o email).", clienteData);
        return;
    }

    // --- Bloque para actualizar la UI del cliente encontrado ---
    try {
        window.clienteEscaneadoParaSuma = clienteData; // Guardamos el cliente escaneado en el objeto global.

        clienteEncontradoInfoDiv.style.display = 'block'; // Hacemos visible el contenedor de información del cliente.

        clienteEscaneadoEmailEl.textContent = clienteData.email || 'No disponible';
        clienteEscaneadoPuntosEl.textContent = clienteData.puntos || 0;

        // --- LÓGICA PARA MANEJAR LA VISIBILIDAD DE LOS FORMULARIOS ---
        // Al mostrar la información del cliente, OCULTAMOS ambos formularios de entrada de puntos,
        // ya que la selección de la acción (sumar/restar) la harán los botones que están justo encima.
        
        if (sumarPuntosFormContainer) {
            sumarPuntosFormContainer.style.display = 'none'; // Ocultamos el formulario de sumar por defecto.
        }
        if (descontarPuntosFormContainer) {
            descontarPuntosFormContainer.style.display = 'none'; // Ocultamos el formulario de descontar por defecto.
        }
        
        // Limpiar los mensajes y campos de los formularios para asegurar una interfaz limpia.
        if (puntosASumarDesdeQRInput) puntosASumarDesdeQRInput.value = '';
        if (puntosADescontarDesdeQRInput) puntosADescontarDesdeQRInput.value = '';
        if (escanearSumarPuntosMessage) mostrarMensaje(escanearSumarPuntosMessage, "");
        if (escanearDescontarPuntosMessage) mostrarMensaje(escanearDescontarPuntosMessage, "");

        // Asegurarse de que el temporizador de mensajes se limpie
        if (autoHideMessageTimer) {
            clearTimeout(autoHideMessageTimer);
            autoHideMessageTimer = null;
        }
        // Limpiar el mensaje general de escaneo
        if (scanMessageEl) mostrarMensaje(scanMessageEl, "");

    } catch (error) {
        console.error("[SCANNER_SERVICE] Error al actualizar la UI con la información del cliente:", error);
        if (scanMessageEl) mostrarMensaje(scanMessageEl, "Error al mostrar información del cliente.", true);
    }
}


export function ocultarInfoClienteEscaneado() {
    window.clienteEscaneadoParaSuma = null; // Limpiamos el cliente global.
    
    if (clienteEncontradoInfoDiv) clienteEncontradoInfoDiv.style.display = 'none';
    
    // Ocultamos AMBOS formularios y sus contenedores
    if (sumarPuntosFormContainer) { // Ocultamos el contenedor de sumar
        sumarPuntosFormContainer.style.display = 'none';
    }
    if (descontarPuntosFormContainer) { // Ocultamos el contenedor de descuento
        descontarPuntosFormContainer.style.display = 'none';
    }

    // Limpiar los inputs de puntos
    if (puntosASumarDesdeQRInput) puntosASumarDesdeQRInput.value = '';
    if (puntosADescontarDesdeQRInput) puntosADescontarDesdeQRInput.value = '';

    // Limpiar los mensajes y el temporizador
    if (scanMessageEl) {
        mostrarMensaje(scanMessageEl, "", false); // Limpiar el mensaje general
    }
    if (autoHideMessageTimer) {
        clearTimeout(autoHideMessageTimer);
        autoHideMessageTimer = null;
    }
    // Limpiar mensajes específicos de los formularios
    if (escanearSumarPuntosMessage) {
        mostrarMensaje(escanearSumarPuntosMessage, "", false);
    }
    if (escanearDescontarPuntosMessage) {
        mostrarMensaje(escanearDescontarPuntosMessage, "", false);
    }
}

// --- Funciones para alternar entre sumar/descontar puntos ---
/**
 * Muestra el formulario para sumar puntos y oculta el de descontar.
 */
export function mostrarFormularioSumar() {
    if (sumarPuntosFormContainer) sumarPuntosFormContainer.style.display = 'block';
    if (descontarPuntosFormContainer) descontarPuntosFormContainer.style.display = 'none';
    
    // Limpiar el campo de entrada y el mensaje del formulario de sumar
    if (puntosASumarDesdeQRInput) puntosASumarDesdeQRInput.value = '';
    if (escanearSumarPuntosMessage) mostrarMensaje(escanearSumarPuntosMessage, "");
}

/**
 * Muestra el formulario para descontar puntos y oculta el de sumar.
 */
export function mostrarFormularioDescontar() {
    if (sumarPuntosFormContainer) sumarPuntosFormContainer.style.display = 'none';
    if (descontarPuntosFormContainer) descontarPuntosFormContainer.style.display = 'block';

    // Limpiar el campo de entrada y el mensaje del formulario de descontar
    if (puntosADescontarDesdeQRInput) puntosADescontarDesdeQRInput.value = '';
    if (escanearDescontarPuntosMessage) mostrarMensaje(escanearDescontarPuntosMessage, "");
}