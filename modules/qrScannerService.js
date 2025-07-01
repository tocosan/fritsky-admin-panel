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
let puntosASumarDesdeQRInput;
let qrScannerElement; // Referencia al div donde se renderiza el escáner
// Variable para almacenar temporalmente la información del cliente escaneado
window.clienteEscaneadoParaSuma = null;
// --- Inicialización y Configuración ---
/**
Configura las referencias al DOM necesarias para el módulo del escáner.
DEBE llamarse después de que el DOM esté cargado.
@param {object} refs - Un objeto con las referencias del DOM.
@param {HTMLElement} refs.scanMessageEl - Elemento para mensajes de escaneo.
@param {HTMLElement} refs.qrScannerElement - Div donde se renderiza el escáner.
@param {HTMLElement} refs.clienteEncontradoInfoDiv - Div con info del cliente escaneado.
@param {HTMLElement} refs.clienteEscaneadoEmailEl - Elemento para mostrar email del cliente.
@param {HTMLElement} refs.clienteEscaneadoPuntosEl - Elemento para mostrar puntos del cliente.
@param {HTMLElement} refs.puntosASumarDesdeQRInput - Input para sumar puntos desde QR.
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
}
/**
Inicializa el escáner QR, deteniendo uno previo si existe.
@param {function} onScanSuccess - Callback para cuando se escanea un QR válido.
@param {function} onScanFailure - Callback para errores de escaneo.
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
                     stopScanner(); // Detenemos el escáner
                     onScanSuccess(clienteUid); // Llamamos al callback de éxito
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
              
             if (onScanFailure) onScanFailure(error);
         }
     );
     console.log("[SCANNER_SERVICE] Escáner iniciado exitosamente.");

 } catch (e) {
     console.error("[SCANNER_SERVICE] Fallo al inicializar Html5QrcodeScanner:", e);
     mostrarMensaje(scanMessageEl, "No se pudo iniciar la cámara. Verifique permisos y estado.", true);
     if (onScanFailure) onScanFailure(e);
 }

}, 100);
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
// Opcionalmente, puedes resetear la variable aquí también en caso de error al detener
html5QrCodeScanner = null;
});
} else {
// Si no existe o no tiene la función stop, no hacemos nada (o podrías loggear una advertencia si quieres)
// console.log("[SCANNER_SERVICE] Escáner no activo o ya detenido, no se necesita stop.");
// Asegurarnos de que la variable sea null por si acaso
if (html5QrCodeScanner !== null) {
html5QrCodeScanner = null;
}
}
}
/**
Muestra la información de un cliente escaneado.
@param {object} clienteData - Datos del cliente (id, email, puntos).
*/
export function mostrarInfoClienteEscaneado(clienteData) {
window.clienteEscaneadoParaSuma = clienteData;
if (clienteEncontradoInfoDiv) clienteEncontradoInfoDiv.style.display = 'block';
if (clienteEscaneadoEmailEl) clienteEscaneadoEmailEl.textContent = clienteData.email || 'No disponible';
if (clienteEscaneadoPuntosEl) clienteEscaneadoPuntosEl.textContent = clienteData.puntos || 0;
if (puntosASumarDesdeQRInput) puntosASumarDesdeQRInput.value = ''; // Limpiar campo de puntos
mostrarMensaje(scanMessageEl, ""); // Limpiar mensajes
}
/**
Oculta la información del cliente escaneado.
*/
export function ocultarInfoClienteEscaneado() {
window.clienteEscaneadoParaSuma = null;
if (clienteEncontradoInfoDiv) clienteEncontradoInfoDiv.style.display = 'none';
}
// Exportamos la variable global para que pueda ser accedida si es necesario desde el orquestador.
export { html5QrCodeScanner };