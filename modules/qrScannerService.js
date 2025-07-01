// modules/qrScannerService.js
import { mostrarMensaje } from './utils.js'; // Importamos la función de utilidad

// --- Variables del Módulo ---
let html5QrCodeScanner = null; // Instancia global del escáner
let scanMessageEl; // Referencia al elemento para mostrar mensajes del escáner
let clienteEncontradoInfoDiv;
let clienteEscaneadoEmailEl;
let clienteEscaneadoPuntosEl;
let puntosASumarDesdeQRInput;
let qrScannerElement; // Referencia al div donde se renderiza el escáner

// Variable para almacenar temporalmente la información del cliente escaneado, accesible globalmente para el formulario de suma
window.clienteEscaneadoParaSuma = null; 

// Variable para almacenar la función de callback que recibe desde mainAdmin.js para sumar puntos
let sumaPuntosCallback = null; 

// --- Inicialización y Configuración ---

/**
 * Configura las referencias al DOM necesarias para el módulo del escáner.
 * DEBE llamarse DESPUÉS de que el DOM esté cargado y los elementos existan.
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
    clienteEscaneadoPuntosEl: puntosEl,
    puntosASumarDesdeQRInput: puntosInput
}) {
    scanMessageEl = msgEl;
    qrScannerElement = qrEl;
    clienteEncontradoInfoDiv = infoDiv;
    clienteEscaneadoEmailEl = emailEl;
    clienteEscaneadoPuntosEl = puntosEl;
    puntosASumarDesdeQRInput = puntosInput;

    // --- CONFIGURACIÓN DEL LISTENER PARA SUMAR PUNTOS DESDE EL ESCÁNER ---
    const escanearSumarPuntosForm = document.getElementById('escanearSumarPuntosForm');
    
    if (escanearSumarPuntosForm && puntosASumarDesdeQRInput) {
        // Añadimos el listener al submit del formulario
        escanearSumarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevenir el comportamiento por defecto del formulario

            // Obtenemos los puntos directamente del input
            const puntos = parseInt(puntosASumarDesdeQRInput.value, 10);
            
            // Verificamos si tenemos un cliente escaneado guardado y si se ha proporcionado el callback para sumar puntos
            if (window.clienteEscaneadoParaSuma && sumaPuntosCallback) {
                // Llamamos a la función de suma de puntos que nos pasó mainAdmin.js
                // Pasamos el ID del cliente y la cantidad de puntos a sumar
                try {
                    // La función en mainAdmin.js se encargará de la lógica de sumar puntos y de mostrar mensajes/resetear.
                    await sumaPuntosCallback(window.clienteEscaneadoParaSuma.id, puntos);
                } catch (error) {
                    console.error("[SCANNER_SERVICE] Error al ejecutar sumaPuntosCallback:", error);
                    mostrarMensaje(scanMessageEl, "Error al procesar la suma de puntos desde el escáner.", true);
                }
            } else {
                // Si no hay cliente o callback, mostramos un mensaje de error apropiado.
                if (!window.clienteEscaneadoParaSuma) {
                    mostrarMensaje(scanMessageEl, "Por favor, escanea primero el QR de un cliente válido.", true);
                } else {
                    mostrarMensaje(scanMessageEl, "La función de suma de puntos no está configurada correctamente.", true);
                }
            }
        });
    } else {
        console.error("[SCANNER_SERVICE] Referencias del DOM para el formulario de suma de puntos no encontradas. Asegúrate de que 'escanearSumarPuntosForm' y 'puntosASumarDesdeQRInput' existan.");
    }
    // --- FIN CONFIGURACIÓN LISTENER ---
}

/**
 * Establece la función de callback que se ejecutará cuando el usuario intente sumar puntos
 * después de haber escaneado un cliente. Esta función es proporcionada por mainAdmin.js.
 * @param {function(string, number): Promise<void>} handler - La función que sumará los puntos.
 */
export function setSumaPuntosHandler(handler) {
    // Guardamos la función que recibimos desde mainAdmin.js.
    // Esta función será llamada por el listener del formulario de suma de puntos.
    sumaPuntosCallback = handler; 
}

/**
 * Inicializa el escáner QR de Html5QrcodeScanner.
 * Detiene cualquier instancia previa si existe.
 * @param {function(string): Promise<void>} onScanSuccess - Callback que se ejecuta cuando se escanea un QR válido (recibe el clienteUid).
 * @param {function(Error): void} onScanFailure - Callback para manejar errores durante el escaneo.
 */
export function initializeScanner(onScanSuccess, onScanFailure) {
    // Detenemos y limpiamos cualquier escáner anterior antes de inicializar uno nuevo
    if (html5QrCodeScanner) {
        html5QrCodeScanner.stop().then(() => {
            console.log("[SCANNER_SERVICE] Escáner QR existente detenido antes de iniciar uno nuevo.");
            html5QrCodeScanner.clear(); 
        }).catch(error => {
            console.error("[SCANNER_SERVICE] Error al detener escáner existente:", error);
        });
        html5QrCodeScanner = null; // Aseguramos que la referencia se limpie
    }

    console.log("[SCANNER_SERVICE] Intentando inicializar escáner...");

    // Usamos un pequeño timeout para asegurar que el DOM esté completamente listo y la sección sea visible antes de intentar renderizar el escáner.
    setTimeout(() => {
        if (!qrScannerElement) {
            console.error("[SCANNER_SERVICE] El elemento del DOM para el escáner (#qrScannerElement) no está configurado correctamente.");
            mostrarMensaje(scanMessageEl, "Error: Contenedor del escáner no configurado.", true);
            if (onScanFailure) onScanFailure(new Error("qrScannerElement no configurado"));
            return; 
        }

        try {
            // Creamos una nueva instancia del escáner
            html5QrCodeScanner = new Html5QrcodeScanner(qrScannerElement.id, { 
                fps: 10, // Frames por segundo para el escaneo
                qrbox: { width: 250, height: 250 } // Tamaño del área de escaneo
            });

            // Renderizamos el escáner en el elemento especificado.
            // El primer callback es para cuando el escaneo es exitoso, el segundo para fallos.
            html5QrCodeScanner.render(
                (decodedText, decodedResult) => {
                    // Procesamos el texto decodificado. Asumimos que el QR tiene el formato "fritsky_user:UIDDELCLIENTE"
                    if (decodedText && typeof decodedText === 'string' && decodedText.startsWith("fritsky_user:")) {
                        const parts = decodedText.split(':');
                        if (parts.length === 2) {
                            const clienteUid = parts[1]; 
                            console.log(`[SCANNER_SERVICE] UID del cliente extraído del QR: ${clienteUid}`);
                            stopScanner(); // Detenemos el escáner una vez que hemos capturado un QR válido
                            onScanSuccess(clienteUid); // Llamamos al callback de éxito pasado desde mainAdmin.js
                        } else {
                            // Si el formato no es el esperado
                            mostrarMensaje(scanMessageEl, "Formato de QR inválido. Escanea el código de cliente correcto.", true);
                            if (onScanFailure) onScanFailure(new Error("Formato de QR inválido"));
                        }
                    } else {
                        // Si el texto decodificado no es un string o no empieza con el prefijo esperado
                        mostrarMensaje(scanMessageEl, "Formato de QR inválido. Escanea el código de cliente correcto.", true);
                        if (onScanFailure) onScanFailure(new Error("Formato de QR inválido"));
                    }
                },
                (error) => { // Handler para fallos en el escaneo (ej: no hay cámara, permisos denegados)
                    console.error("[SCANNER_SERVICE] Error durante el escaneo:", error);
                    mostrarMensaje(scanMessageEl, `Error de escaneo: ${error.message || 'Intenta de nuevo o verifica permisos.'}`, true);
                    if (onScanFailure) onScanFailure(error); // Pasamos el error al callback de mainAdmin.js
                }
            );
            console.log("[SCANNER_SERVICE] Escáner iniciado exitosamente. Listo para escanear.");

        } catch (e) {
            // Capturamos errores al intentar crear la instancia o renderizar
            console.error("[SCANNER_SERVICE] Fallo crítico al inicializar Html5QrcodeScanner:", e);
            mostrarMensaje(scanMessageEl, "No se pudo iniciar la cámara. Asegúrate de dar permisos y que tu dispositivo tenga cámara.", true);
            if (onScanFailure) onScanFailure(e);
        }
    }, 100); // Un pequeño delay para asegurar la correcta carga del DOM
}

/**
 * Detiene la instancia del escáner QR activo y limpia los elementos de la interfaz relacionados.
 */
export function stopScanner() {
    // Verificamos si existe una instancia de escáner y si tiene el método 'stop'
    if (html5QrCodeScanner && typeof html5QrCodeScanner.stop === 'function') {
        html5QrCodeScanner.stop().then(() => {
            console.log("[SCANNER_SERVICE] Escáner QR detenido correctamente.");
            html5QrCodeScanner.clear(); // Limpia el canvas/video del escáner
            html5QrCodeScanner = null; // Limpia la referencia a la instancia
        }).catch(error => {
            console.error("[SCANNER_SERVICE] Error al detener el escáner:", error);
            // En caso de error al detener, asegurarnos de limpiar la referencia también
            html5QrCodeScanner = null; 
        });
    } else {
        // Si no hay instancia activa o no tiene el método 'stop', simplemente nos aseguramos de que la referencia sea null.
        if (html5QrCodeScanner !== null) {
            html5QrCodeScanner = null;
        }
    }
}

/**
 * Muestra la información de un cliente escaneado en la interfaz del escáner.
 * @param {object} clienteData - Datos del cliente, debe contener al menos { id, email, puntos }.
 */
export function mostrarInfoClienteEscaneado(clienteData) {
    // Guardamos los datos del cliente escaneado en una variable global para que el formulario de suma de puntos pueda acceder a ella.
    window.clienteEscaneadoParaSuma = clienteData;
    
    // Hacemos visibles los elementos de información del cliente y el formulario para sumar puntos.
    if (clienteEncontradoInfoDiv) clienteEncontradoInfoDiv.style.display = 'block';
    
    // Actualizamos los textos con los datos del cliente.
    if (clienteEscaneadoEmailEl) clienteEscaneadoEmailEl.textContent = clienteData.email || 'No disponible';
    if (clienteEscaneadoPuntosEl) clienteEscaneadoPuntosEl.textContent = clienteData.puntos || 0;
    
    // Limpiamos el campo de entrada de puntos y lo habilitamos.
    if (puntosASumarDesdeQRInput) {
        puntosASumarDesdeQRInput.value = ''; 
        puntosASumarDesdeQRInput.disabled = false; // Habilitamos para que el usuario pueda ingresar puntos
    }

    // Limpiamos cualquier mensaje de estado anterior.
    mostrarMensaje(scanMessageEl, ""); 
}

/**
 * Oculta la información del cliente escaneado y resetea los elementos relacionados.
 */
export function ocultarInfoClienteEscaneado() {
    window.clienteEscaneadoParaSuma = null; // Limpiamos la referencia al cliente escaneado
    
    // Ocultamos el div de información del cliente
    if (clienteEncontradoInfoDiv) clienteEncontradoInfoDiv.style.display = 'none';
    
    // Reseteamos el input de puntos y el formulario completo.
    if (puntosASumarDesdeQRInput) {
        puntosASumarDesdeQRInput.value = '';
        puntosASumarDesdeQRInput.disabled = true; // Deshabilitamos hasta que se escanee un cliente válido de nuevo
    }
    
    const escanearSumarPuntosForm = document.getElementById('escanearSumarPuntosForm');
    if (escanearSumarPuntosForm) {
        escanearSumarPuntosForm.reset(); // Reseteamos el formulario para asegurar que no queden valores previos
    }
}

// Exportamos la referencia a la instancia del escáner si fuera necesario por alguna otra parte del código (aunque actualmente no se usa).
export { html5QrCodeScanner };