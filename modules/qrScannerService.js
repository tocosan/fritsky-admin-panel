// modules/qrScannerService.js
import { mostrarMensaje } from './utils.js'; // Importamos la función de utilidad

// --- Variables del Módulo ---
let html5QrCodeScanner = null; // Instancia global del escáner para poder detenerlo y limpiarlo.
let scanMessageEl; // Referencia al elemento HTML donde se muestran los mensajes de estado del escáner.
let clienteEncontradoInfoDiv; // Div que contiene la información del cliente escaneado.
let clienteEscaneadoEmailEl; // Elemento para mostrar el email del cliente escaneado.
let clienteEscaneadoPuntosEl; // Elemento para mostrar los puntos actuales del cliente escaneado.
let puntosASumarDesdeQRInput; // Input donde el usuario ingresa los puntos a sumar.
let qrScannerElement; // El div principal donde se renderiza el video del escáner.

// Variable global para almacenar temporalmente los datos del cliente escaneado.
// Esto es crucial para que el formulario de suma de puntos pueda acceder a la información del cliente escaneado.
window.clienteEscaneadoParaSuma = null; 

// Variable para almacenar la función de callback que recibe desde mainAdmin.js.
// Esta función será la encargada de realizar la lógica de suma de puntos en la base de datos.
let sumaPuntosCallback = null; 

// --- Inicialización y Configuración ---

/**
 * Configura las referencias al DOM que este módulo necesita para interactuar con la interfaz de usuario.
 * DEBE llamarse DESPUÉS de que el DOM esté completamente cargado y los elementos existan.
 * @param {object} refs - Un objeto con las referencias del DOM.
 * @param {HTMLElement} refs.scanMessageEl - Elemento para mostrar mensajes de escaneo.
 * @param {HTMLElement} refs.qrScannerElement - Div donde se renderiza el escáner.
 * @param {HTMLElement} refs.clienteEncontradoInfoDiv - Div que contiene la información del cliente escaneado.
 * @param {HTMLElement} refs.clienteEscaneadoEmailEl - Elemento para mostrar el email del cliente.
 * @param {HTMLElement} refs.clienteEscaneadoPuntosEl - Elemento para mostrar los puntos del cliente.
 * @param {HTMLElement} refs.puntosASumarDesdeQRInput - Input para que el usuario ingrese los puntos a sumar.
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
    // Buscamos el formulario específico para sumar puntos en la sección del escáner.
    const escanearSumarPuntosForm = document.getElementById('escanearSumarPuntosForm');
    
    // Si encontramos el formulario y el input de puntos, configuramos el listener.
    if (escanearSumarPuntosForm && puntosASumarDesdeQRInput) {
        // Añadimos el listener al evento 'submit' del formulario.
        escanearSumarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevenimos el comportamiento por defecto del formulario (recarga de página).

            // Obtenemos la cantidad de puntos que el usuario ha ingresado.
            const puntos = parseInt(puntosASumarDesdeQRInput.value, 10);
            
            // Verificamos que tengamos datos de un cliente escaneado guardados globalmente
            // y que la función de callback para sumar puntos (pasada desde mainAdmin.js) esté definida.
            if (window.clienteEscaneadoParaSuma && sumaPuntosCallback) {
                // Si todo está en orden, llamamos a la función de callback para realizar la suma de puntos.
                // Pasamos el ID del cliente y la cantidad de puntos.
                try {
                    // La función que se ejecuta aquí (definida en mainAdmin.js) se encargará de
                    // llamar a sumarPuntosAFirestore, mostrar mensajes de éxito/error, resetear el formulario, etc.
                    await sumaPuntosCallback(window.clienteEscaneadoParaSuma.id, puntos);
                } catch (error) {
                    console.error("[SCANNER_SERVICE] Error al ejecutar sumaPuntosCallback:", error);
                    // Mostramos un mensaje genérico si falla la ejecución del callback.
                    mostrarMensaje(scanMessageEl, "Error al procesar la suma de puntos desde el escáner.", true);
                }
            } else {
                // Si falta información (cliente no escaneado o callback no configurado), mostramos un mensaje de error.
                if (!window.clienteEscaneadoParaSuma) {
                    mostrarMensaje(scanMessageEl, "Por favor, escanea primero el QR de un cliente válido.", true);
                } else {
                    mostrarMensaje(scanMessageEl, "La función de suma de puntos no está configurada correctamente.", true);
                }
            }
        });
    } else {
        // Si no se encuentran los elementos del DOM necesarios, registramos un error.
        console.error("[SCANNER_SERVICE] Referencias del DOM para el formulario de suma de puntos no encontradas. Asegúrate de que 'escanearSumarPuntosForm' y 'puntosASumarDesdeQRInput' existan en el HTML.");
    }
    // --- FIN CONFIGURACIÓN LISTENER ---
}

/**
 * Establece la función de callback que se ejecutará cuando el usuario intente sumar puntos
 * después de haber escaneado un cliente. Esta función es proporcionada por mainAdmin.js.
 * @param {function(string, number): Promise<void>} handler - La función que realizará la lógica de suma de puntos. Recibe el clienteId y la cantidad de puntos.
 */
export function setSumaPuntosHandler(handler) {
    // Guardamos la función que recibimos desde mainAdmin.js en nuestra variable local.
    // Esta función será llamada por el listener del formulario de suma de puntos.
    sumaPuntosCallback = handler; 
}

/**
 * Inicializa el escáner QR utilizando la librería Html5QrcodeScanner.
 * Detiene cualquier instancia previa del escáner si existe para evitar conflictos.
 * @param {function(string): Promise<void>} onScanSuccess - Callback que se ejecuta cuando se escanea un QR válido. Recibe el UID del cliente.
 * @param {function(Error): void} onScanFailure - Callback para manejar errores que ocurran durante el proceso de escaneo.
 */
export function initializeScanner(onScanSuccess, onScanFailure) {
    // Si ya hay una instancia de escáner activa, la detenemos y limpiamos antes de crear una nueva.
    if (html5QrCodeScanner) {
        html5QrCodeScanner.stop().then(() => {
            console.log("[SCANNER_SERVICE] Escáner QR existente detenido antes de iniciar uno nuevo.");
            html5QrCodeScanner.clear(); // Limpia la interfaz del escáner.
        }).catch(error => {
            console.error("[SCANNER_SERVICE] Error al detener escáner existente:", error);
        });
        html5QrCodeScanner = null; // Aseguramos que la referencia se limpie para evitar problemas.
    }

    console.log("[SCANNER_SERVICE] Intentando inicializar escáner...");

    // Usamos un pequeño timeout para asegurar que el DOM esté completamente cargado y la sección sea visible
    // antes de intentar renderizar el escáner. Esto puede ayudar a evitar errores de renderizado.
    setTimeout(() => {
        // Verificamos si el elemento contenedor del escáner ha sido correctamente referenciado.
        if (!qrScannerElement) {
            console.error("[SCANNER_SERVICE] El elemento del DOM para el escáner (#qrScannerElement) no está configurado correctamente.");
            mostrarMensaje(scanMessageEl, "Error: Contenedor del escáner no configurado.", true);
            if (onScanFailure) onScanFailure(new Error("qrScannerElement no configurado")); // Informamos del error.
            return; 
        }

        try {
            // Creamos una nueva instancia de Html5QrcodeScanner, pasándole el ID del div contenedor y las opciones de configuración.
            html5QrCodeScanner = new Html5QrcodeScanner(qrScannerElement.id, { 
                fps: 10, // Frames por segundo para el escaneo.
                qrbox: { width: 250, height: 250 } // Define el tamaño del área rectangular donde se espera detectar el QR.
            });

            // Renderizamos el escáner en el elemento especificado.
            // Pasamos dos callbacks: uno para el éxito del escaneo y otro para los fallos.
            html5QrCodeScanner.render(
                (decodedText, decodedResult) => {
                    // --- Procesamos el texto decodificado cuando el escaneo es exitoso ---
                    // Verificamos que el texto sea un string válido y que comience con el prefijo esperado "fritsky_user:".
                    if (decodedText && typeof decodedText === 'string' && decodedText.startsWith("fritsky_user:")) {
                        const parts = decodedText.split(':'); // Separamos el prefijo del UID.
                        if (parts.length === 2) {
                            const clienteUid = parts[1]; // Extraemos el UID del cliente.
                            console.log(`[SCANNER_SERVICE] UID del cliente extraído del QR: ${clienteUid}`);
                            stopScanner(); // Detenemos el escáner inmediatamente después de un escaneo exitoso.
                            onScanSuccess(clienteUid); // Llamamos al callback de éxito pasado desde mainAdmin.js.
                        } else {
                            // Si el formato del QR no es el esperado (ej. "fritsky_user:" sin UID).
                            mostrarMensaje(scanMessageEl, "Formato de QR inválido. Escanea el código de cliente correcto.", true);
                            if (onScanFailure) onScanFailure(new Error("Formato de QR inválido"));
                        }
                    } else {
                        // Si el texto decodificado no es un string o no tiene el prefijo esperado.
                        mostrarMensaje(scanMessageEl, "Formato de QR inválido. Escanea el código de cliente correcto.", true);
                        if (onScanFailure) onScanFailure(new Error("Formato de QR inválido"));
                    }
                },
                (error) => { // --- Handler para fallos en el escaneo ---
                    // Este callback se ejecuta si hay problemas al iniciar la cámara, al acceder a ella, o durante el escaneo.
                    console.error("[SCANNER_SERVICE] Error durante el escaneo:", error);
                    // Mostramos un mensaje de error más amigable al usuario.
                    mostrarMensaje(scanMessageEl, `Error de escaneo: ${error.message || 'Intenta de nuevo o verifica permisos.'}`, true);
                    if (onScanFailure) onScanFailure(error); // Pasamos el error al callback principal para su gestión.
                }
            );
            console.log("[SCANNER_SERVICE] Escáner iniciado exitosamente. Listo para escanear.");

        } catch (e) {
            // Capturamos errores críticos que puedan ocurrir al crear la instancia o al intentar renderizar el escáner.
            console.error("[SCANNER_SERVICE] Fallo crítico al inicializar Html5QrcodeScanner:", e);
            mostrarMensaje(scanMessageEl, "No se pudo iniciar la cámara. Asegúrate de dar permisos y que tu dispositivo tenga cámara.", true);
            if (onScanFailure) onScanFailure(e); // Informamos del fallo.
        }
    }, 100); // Un pequeño delay para asegurar la correcta carga del DOM.
}

/**
 * Detiene la instancia del escáner QR activo y limpia los elementos de la interfaz relacionados.
 * Es importante llamar a esta función cuando la sección del escáner deja de ser visible.
 */
export function stopScanner() {
    // Verificamos si existe una instancia de escáner activa y si tiene el método 'stop'.
    if (html5QrCodeScanner && typeof html5QrCodeScanner.stop === 'function') {
        html5QrCodeScanner.stop().then(() => {
            console.log("[SCANNER_SERVICE] Escáner QR detenido correctamente.");
            html5QrCodeScanner.clear(); // Limpia el canvas/video del escáner de la interfaz.
            html5QrCodeScanner = null; // Limpia la referencia a la instancia para evitar problemas de memoria o concurrencia.
        }).catch(error => {
            console.error("[SCANNER_SERVICE] Error al detener el escáner:", error);
            // En caso de error al detener, nos aseguramos de limpiar la referencia también.
            html5QrCodeScanner = null; 
        });
    } else {
        // Si no hay una instancia activa o no tiene el método 'stop', simplemente nos aseguramos de que la referencia sea null.
        if (html5QrCodeScanner !== null) {
            html5QrCodeScanner = null;
        }
    }
}

/**
 * Muestra la información de un cliente escaneado en la interfaz de la sección del escáner.
 * @param {object} clienteData - Datos del cliente. Se espera que contenga al menos { id, email, puntos }.
 */
export function mostrarInfoClienteEscaneado(clienteData) {
    // Guardamos los datos del cliente escaneado en una variable global para que el formulario de suma de puntos pueda acceder a ella.
    window.clienteEscaneadoParaSuma = clienteData;
    
    // Hacemos visibles los elementos que muestran la información del cliente.
    if (clienteEncontradoInfoDiv) clienteEncontradoInfoDiv.style.display = 'block';
    
    // Actualizamos los textos con los datos del cliente.
    if (clienteEscaneadoEmailEl) clienteEscaneadoEmailEl.textContent = clienteData.email || 'No disponible';
    if (clienteEscaneadoPuntosEl) clienteEscaneadoPuntosEl.textContent = clienteData.puntos || 0;
    
    // Limpiamos el campo de entrada de puntos y lo habilitamos para que el usuario pueda ingresar la cantidad.
    if (puntosASumarDesdeQRInput) {
        puntosASumarDesdeQRInput.value = ''; 
        puntosASumarDesdeQRInput.disabled = false; // Habilitamos el input.
    }

    // --- Limpiamos cualquier mensaje de estado anterior que pudiera estar visible en el escáner ---
    // Esto ayuda a que el mensaje de "error de escaneo" que a veces persiste se elimine cuando mostramos info del cliente.
    if (scanMessageEl) {
        mostrarMensaje(scanMessageEl, ""); 
    }
    // -------------------------------------------------------------------------------------------
}

/**
 * Oculta la información del cliente escaneado y resetea los elementos relacionados en la interfaz.
 */
export function ocultarInfoClienteEscaneado() {
    window.clienteEscaneadoParaSuma = null; // Limpiamos la referencia al cliente escaneado.
    
    // Ocultamos el div que muestra la información del cliente.
    if (clienteEncontradoInfoDiv) clienteEncontradoInfoDiv.style.display = 'none';
    
    // Reseteamos el input de puntos y el formulario de suma de puntos.
    if (puntosASumarDesdeQRInput) {
        puntosASumarDesdeQRInput.value = ''; // Limpiamos el valor del input.
        puntosASumarDesdeQRInput.disabled = true; // Deshabilitamos el input hasta que se escanee un cliente válido de nuevo.
    }
    
    const escanearSumarPuntosForm = document.getElementById('escanearSumarPuntosForm');
    if (escanearSumarPuntosForm) {
        escanearSumarPuntosForm.reset(); // Reseteamos el formulario para asegurar que no queden valores previos.
    }
}

// Exportamos la referencia a la instancia del escáner por si se necesitara en algún otro lugar.
export { html5QrCodeScanner };