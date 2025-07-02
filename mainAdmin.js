// mainAdmin.js - El nuevo punto de entrada para el Panel de Admin
// --- Importaciones de Módulos ---
import { dbAdmin, onAuthStateChangedAdmin, iniciarSesionAdmin, cerrarSesionAdmin } from './modules/authService.js';
import { buscarClientePorUid, buscarClientePorEmail, sumarPuntosAFirestore, setFirestoreDOMReferences, obtenerTodosLosClientes, obtenerClientePorId } from './modules/firestoreService.js'; // Asegúrate de que 'obtenerTodosLosClientes' y 'obtenerClientePorId' estén exportados en firestoreService.js
import { mostrarMensaje, obtenerMensajeErrorFirebase } from './modules/utils.js';
// --- Configuración y Referencias Globales ---
let adminLoginSection, sumarPuntosSection, escanearQrSection, adminLoginForm, sumarPuntosForm, escanearSumarPuntosForm, adminLogoutButton, adminUserInfoDiv;
let adminLoginErrorEl, sumarPuntosMessageEl, clienteEmailInput, puntosASumarInput, adminEmailInput, adminPasswordInput;

// Referencias específicas del escáner y el formulario asociado
let scanMessageEl;
let clienteEncontradoInfoDiv;
let clienteEscaneadoEmailEl;
let clienteEscaneadoPuntosEl;
let puntosASumarDesdeQRInput;

// --- NUEVAS Referencias para la sección de gestión de clientes ---
let clientesSection;
let clientesListContainer;
let clientesTable;
let clientesTableBody;
let clientesMessage;
let clienteDetailContainer;
let clienteDetailEmail;
let clienteDetailPuntos;
let clienteDetailFechaRegistro;

let detalleSumarPuntosForm;
let puntosASumarEnDetalle;
let detalleSumarPuntosMessage;

let btnMostrarClientes; // Botón para ir a la sección de clientes
let btnVolverDesdeClientes; // Botón para volver desde la sección de clientes
let btnCerrarClienteDetail; // Botón para cerrar el detalle de cliente y volver al listado

let btnVolverAInicio, btnMostrarSumarPuntos, btnMostrarEscanearQR;
// Para mantener una referencia al módulo QR y sus funciones.
let qrScannerModule = null; // Referencia al módulo cargado dinámicamente.

// Temporizador para el auto-ocultamiento de mensajes en mainAdmin.js
let autoHideMessageTimerMain = null;

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
    if (autoHideMessageTimerMain) {
        clearTimeout(autoHideMessageTimerMain);
    }

    // Mostrar el mensaje
    mostrarMensaje(element, message, isError); // Usamos la función importada

    // Programar el ocultamiento
    autoHideMessageTimerMain = setTimeout(() => {
        mostrarMensaje(element, "", false); // Limpia el mensaje
        autoHideMessageTimerMain = null; // Limpiar la referencia al temporizador
    }, duration);
}

// --- Funciones Auxiliares del Orquestador ---
/**
Cambia la visibilidad de las secciones principales de la interfaz.
También se encarga de detener el escáner si se está cambiando de sección.
@param {string} idSeccionTarget - El ID de la sección a mostrar.
*/


function mostrarSeccionAdmin(idSeccionTarget) {
    // Detener el escáner ANTES de cambiar de sección si el módulo QR está cargado
    if (qrScannerModule && qrScannerModule.stopScanner) {
        console.log("[NAV_ORCHESTRATOR] Deteniendo escáner QR al cambiar de sección.");
        qrScannerModule.stopScanner();
        qrScannerModule = null; // Limpiamos la referencia para forzar una recarga la próxima vez.
    }
    const todasLasSecciones = document.querySelectorAll('.admin-card'); // Asegúrate de que 'admin-card' sea la clase común
    todasLasSecciones.forEach(section => section.style.display = 'none');
    
    // Mostrar la sección seleccionada
    const seccionSeleccionada = document.getElementById(idSeccionTarget);
    if (seccionSeleccionada) {
        seccionSeleccionada.style.display = 'block';
    }
}

// Función para cargar el módulo QR y configurar sus referencias INTERNAS.
async function loadQrScannerModule() {
    if (qrScannerModule) { // Si el módulo ya está cargado, simplemente devolvemos la referencia.
        return qrScannerModule;
    }

    try {
        // Cargamos el módulo dinámicamente
        const module = await import('./modules/qrScannerService.js');
        qrScannerModule = module; // Guardamos el módulo cargado

        // Obtenemos las referencias del DOM necesarias INTERNAMENTE para el módulo QR.
        const qrScannerReferences = {
            scanMessageEl: document.getElementById('scanMessage'),
            qrScannerElement: document.getElementById('qrScannerElement'),
            clienteEncontradoInfoDiv: document.getElementById('clienteEncontradoInfo'),
            clienteEscaneadoEmailEl: document.getElementById('clienteEscaneadoEmail'),
            clienteEscaneadoPuntosEl: document.getElementById('clienteEscaneadoPuntos'),
            puntosASumarDesdeQRInput: document.getElementById('puntosASumarDesdeQR') // Referencia crucial para el formulario de suma.
        };

        // Validamos que todas las referencias necesarias para el módulo QR sean encontradas
    if (!qrScannerReferences.scanMessageEl || !qrScannerReferences.qrScannerElement || !qrScannerReferences.puntosASumarDesdeQRInput || !qrScannerReferences.clienteEscaneadoPuntosEl) { // <-- ¡Asegúrate de que clienteEscaneadoPuntosEl esté aquí!
        console.error("[MAIN_ORCHESTRATOR] ERROR CRÍTICO: No se encontraron todas las referencias DOM necesarias para el escáner. Verifique los IDs en index.html (especialmente clienteEscaneadoPuntos).");
        const msgEl = qrScannerReferences.scanMessageEl || document.getElementById('scanMessage');
        if (msgEl) mostrarMensaje(msgEl, "Error interno de configuración del escáner.", true);
        return null;
        }

        // Llamamos a setScannerDOMReferences con las referencias del DOM
        if (qrScannerModule.setScannerDOMReferences) {
            qrScannerModule.setScannerDOMReferences(qrScannerReferences);
        } else {
            throw new Error("setScannerDOMReferences no está exportado desde qrScannerService.js");
        }

        // Exponemos funciones clave del módulo para que mainAdmin las use.
        return {
            initializeScanner: qrScannerModule.initializeScanner,
            mostrarInfoClienteEscaneado: qrScannerModule.mostrarInfoClienteEscaneado,
            ocultarInfoClienteEscaneado: qrScannerModule.ocultarInfoClienteEscaneado,
            stopScanner: qrScannerModule.stopScanner
        };

    } catch (error) {
        console.error("Error al cargar el módulo qrScannerService:", error);
        const msgEl = document.getElementById('scanMessage');
        if (msgEl) mostrarMensaje(msgEl, "Error al cargar la funcionalidad de escaneo.", true);
        qrScannerModule = null; // Aseguramos que sea null si falla la carga
        return null;
    }
}

// --- MANEJO DEL ESTADO DE AUTENTICACIÓN ---
function handleAuthStateChange(user) {
    if (!adminLoginSection) adminLoginSection = document.getElementById('adminLoginSection');
    if (!sumarPuntosSection) sumarPuntosSection = document.getElementById('sumarPuntosSection');
    if (!escanearQrSection) escanearQrSection = document.getElementById('escanearQrSection');
    if (!clientesSection) clientesSection = document.getElementById('clientesSection'); // <-- Añade esta línea
    if (!adminUserInfoDiv) adminUserInfoDiv = document.getElementById('adminUserInfo');

    if (user) {
        console.log("Usuario conectado:", user.email);
        mostrarSeccionAdmin('sumarPuntosSection'); // Sección principal por defecto
        if (adminUserInfoDiv) adminUserInfoDiv.textContent = `Conectado como admin: ${user.email}`;
    } else {
        console.log("Usuario desconectado.");
        mostrarSeccionAdmin('adminLoginSection');
        if (adminUserInfoDiv) adminUserInfoDiv.textContent = '';
    }
}

// --- Inicialización y Configuración del DOM ---
// mainAdmin.js

// --- Inicialización y Configuración del DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM del Panel de Admin completamente cargado. Iniciando orquestador.");

    // --- Asignar Referencias al DOM ---
    // TODAS estas asignaciones de document.getElementById(...) van aquí.
    adminLoginSection = document.getElementById('adminLoginSection');
    sumarPuntosSection = document.getElementById('sumarPuntosSection');
    escanearQrSection = document.getElementById('escanearQrSection');
    adminLoginForm = document.getElementById('adminLoginForm');
    sumarPuntosForm = document.getElementById('sumarPuntosForm');
    escanearSumarPuntosForm = document.getElementById('escanearSumarPuntosForm');
    adminLogoutButton = document.getElementById('adminLogoutButton');
    adminUserInfoDiv = document.getElementById('adminUserInfo');
    adminLoginErrorEl = document.getElementById('adminLoginError');
    sumarPuntosMessageEl = document.getElementById('sumarPuntosMessage');

    adminEmailInput = document.getElementById('adminEmail');
    adminPasswordInput = document.getElementById('adminPassword');

    clienteEmailInput = document.getElementById('clienteEmail');
    puntosASumarInput = document.getElementById('puntosASumar');

    btnVolverAInicio = document.getElementById('btnVolverAInicio');
    btnMostrarSumarPuntos = document.getElementById('btnMostrarSumarPuntos');
    btnMostrarEscanearQR = document.getElementById('btnMostrarEscanearQR');
    
    // Referencias específicas del escáner y el formulario asociado
    scanMessageEl = document.getElementById('scanMessage');
    clienteEncontradoInfoDiv = document.getElementById('clienteEncontradoInfo');
    clienteEscaneadoEmailEl = document.getElementById('clienteEscaneadoEmail');
    clienteEscaneadoPuntosEl = document.getElementById('clienteEscaneadoPuntos');
    puntosASumarDesdeQRInput = document.getElementById('puntosASumarDesdeQR');

    // Referencias para la sección de gestión de clientes (NUEVO)
    clientesSection = document.getElementById('clientesSection');
    clientesListContainer = document.getElementById('clientesListContainer');
    clientesTable = document.getElementById('clientesTable');
    clientesTableBody = document.getElementById('clientesTableBody');
    clientesMessage = document.getElementById('clientesMessage');
    clienteDetailContainer = document.getElementById('clienteDetailContainer');
    clienteDetailEmail = document.getElementById('clienteDetailEmail');
    clienteDetailPuntos = document.getElementById('clienteDetailPuntos');
    clienteDetailFechaRegistro = document.getElementById('clienteDetailFechaRegistro');
    btnVolverDesdeClientes = document.getElementById('btnVolverDesdeClientes');
    btnCerrarClienteDetail = document.getElementById('btnCerrarClienteDetail');
    btnMostrarClientes = document.getElementById('btnMostrarClientes'); // Botón para ir a la sección de clientes

    detalleSumarPuntosForm = document.getElementById('detalleSumarPuntosForm');
    puntosASumarEnDetalle = document.getElementById('puntosASumarEnDetalle');
    detalleSumarPuntosMessage = document.getElementById('detalleSumarPuntosMessage');

    // --- Validaciones Iniciales de Referencias Cruciales ---
    if (!adminLoginForm || !sumarPuntosForm || !escanearSumarPuntosForm || !puntosASumarDesdeQRInput || !scanMessageEl || !btnMostrarEscanearQR || !btnMostrarClientes || !clientesSection || !clientesTableBody || !clienteDetailContainer) {
        console.error("[MAIN_ORCHESTRATOR] ERROR CRÍTICO: Algunas referencias DOM esenciales no fueron encontradas. Por favor, revise los IDs en index.html.");
        document.body.innerHTML = '<div style="color: red; text-align: center; margin-top: 50px;">Error fatal de configuración de la interfaz. Consulte la consola.</div>';
        return; // Detenemos la inicialización si faltan elementos cruciales.
    }

    // --- Configurar Servicios con Referencias ---
    setFirestoreDOMReferences(dbAdmin, { scanMessageEl: scanMessageEl });

    // --- Configurar listeners de estado de autenticación ---
    onAuthStateChangedAdmin(handleAuthStateChange);

    // --- Navegación entre secciones admin ---
    if (btnMostrarSumarPuntos) {
        btnMostrarSumarPuntos.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: sumarPuntosSection");
            mostrarSeccionAdmin('sumarPuntosSection');
        });
    }

    if (btnVolverAInicio) { 
        btnVolverAInicio.addEventListener('click', () => { 
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: sumarPuntosSection");
            mostrarSeccionAdmin('sumarPuntosSection');
        });
    }

    if (btnMostrarEscanearQR) {
        btnMostrarEscanearQR.addEventListener('click', async () => { // async aquí
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: escanearQrSection");
            mostrarSeccionAdmin('escanearQrSection');

            const scannerApi = await loadQrScannerModule(); // Esperamos a que el módulo se cargue y exponga sus funciones.

            if (!scannerApi) { // Si la carga falló o faltaron referencias críticas DENTRO del módulo.
                console.error("[MAIN_ORCHESTRATOR] Fallo al cargar el módulo QR escáner.");
                return; // No continuamos si el módulo no está listo.
            }

            const { initializeScanner, mostrarInfoClienteEscaneado, ocultarInfoClienteEscaneado } = scannerApi;

            // Restablecemos la UI del escáner antes de iniciarlo
            ocultarInfoClienteEscaneado();
            mostrarMensaje(scanMessageEl, ""); // Limpiamos cualquier mensaje anterior

            initializeScanner(
                async (clienteUid) => { // Callback onScanSuccess: mainAdmin recibe el UID
                    try {
                        console.log(`[MAIN_ORCHESTRATOR] UID recibido en onScanSuccess: ${clienteUid}`); // <-- Log adicional para depurar el UID

                        // Usamos firestoreService para buscar al cliente por UID.
                        const clienteData = await buscarClientePorUid(clienteUid);

                        if (clienteData) {
                            console.log("[MAIN_ORCHESTRATOR] Cliente encontrado, pasando a mostrarInfoClienteEscaneado:", clienteData); // <-- Log adicional con los datos del cliente
                            
                            // Llamamos a la función del módulo QR para actualizar la UI.
                            mostrarInfoClienteEscaneado(clienteData);
                        } else {
                            console.warn(`[MAIN_ORCHESTRATOR] Cliente con UID ${clienteUid} no encontrado en Firestore.`);
                            mostrarMensaje(scanMessageEl, "Cliente no encontrado.", true);
                            ocultarInfoClienteEscaneado(); // Ocultar cualquier información previa.
                        }
                    } catch (error) {
                        console.error("[MAIN_ORCHESTRATOR] Error al procesar cliente escaneado:", error);
                        // Mostrar un mensaje de error más específico al usuario.
                        mostrarMensaje(scanMessageEl, `Error al buscar cliente: ${error.message}`, true);
                        ocultarInfoClienteEscaneado();
                    }
                },
                (error) => { // Callback onScanFailure
                    // Filtrar la advertencia específica de "no se pudo detectar el código"
                    if (error && error.startsWith("QR code parse error") && error.includes("No MultiFormat Readers were able to detect the code")) {
                        // Ignorar esta advertencia común.
                    } else {
                        // Si es otro tipo de error de escaneo, lo mostramos.
                        console.warn("[MAIN_ORCHESTRATOR] Error de escaneo (manejado internamente por el módulo):", error);
                    }
                }
            );
        });
    }

        // --- NUEVO: Listener para el botón "Ver Clientes" ---
    if (btnMostrarClientes) {
        btnMostrarClientes.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: clientesSection");
            mostrarSeccionAdmin('clientesSection');
            cargarYMostrarClientes(); // Cargamos los clientes al entrar en la sección.
        });
    }

    // --- NUEVO: Listener para volver desde el detalle de cliente ---
    if (btnCerrarClienteDetail) {
        btnCerrarClienteDetail.addEventListener('click', () => {
            // Volvemos al listado de clientes
            if (clienteDetailContainer) clienteDetailContainer.style.display = 'none';
            if (clientesListContainer) clientesListContainer.style.display = 'block';
        });
    }
    // --- NUEVO: Listener para volver desde la sección de clientes a la principal ---
    if (btnVolverDesdeClientes) {
        btnVolverDesdeClientes.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Volviendo a la sección de inicio (Sumar Puntos)");
            mostrarSeccionAdmin('sumarPuntosSection');
        });
    }

    if (detalleSumarPuntosForm && puntosASumarEnDetalle && detalleSumarPuntosMessage) {
        detalleSumarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Limpiar mensaje previo
            mostrarMensaje(detalleSumarPuntosMessage, "");

            // Validar la cantidad de puntos a sumar
            const puntosInputVal = puntosASumarEnDetalle.value.trim();
            if (!puntosInputVal) {
                mostrarMensaje(detalleSumarPuntosMessage, "Por favor, ingresa una cantidad válida de puntos.", true);
                return;
            }
            const puntosASumar = parseInt(puntosInputVal, 10);
            if (isNaN(puntosASumar) || puntosASumar <= 0) {
                mostrarMensaje(detalleSumarPuntosMessage, "Por favor, ingresa una cantidad válida de puntos (número positivo).", true);
                return;
            }

            // Si llegamos aquí, el cliente está seleccionado (en window.clienteEscaneadoParaSuma) y los puntos son válidos
            if (!window.clienteEscaneadoParaSuma) {
                console.error("[MAIN_ORCHESTRATOR] No hay cliente seleccionado para sumar puntos.");
                mostrarMensaje(detalleSumarPuntosMessage, "Error interno: No se ha seleccionado un cliente.", true);
                return;
            }

            // mainAdmin.js - Modificación FINAL para actualizar correctamente la UI del detalle


            try {
                await sumarPuntosAFirestore(window.clienteEscaneadoParaSuma.id, puntosASumar);

                console.log(`¡${puntosASumar} puntos sumados a ${window.clienteEscaneadoParaSuma.email} con éxito!`);
                mostrarMensajeConAutoOcultamiento(detalleSumarPuntosMessage, `¡${puntosASumar} puntos sumados con éxito!`, false);

                // --- ACTUALIZACIÓN DE LA UI Y DATOS DEL CLIENTE EN EL DETALLE ---
                // 1. Actualizar la variable global `window.clienteEscaneadoParaSuma` con los nuevos puntos.
                if (window.clienteEscaneadoParaSuma) {
                    // Obtenemos los puntos actuales de la variable global, y sumamos los nuevos.
                    window.clienteEscaneadoParaSuma.puntos = (window.clienteEscaneadoParaSuma.puntos || 0) + puntosASumar;
                }

                // 2. Actualizar la UI en el detalle del cliente (el span que muestra los puntos).
                // USAMOS LA INFORMACIÓN YA ACTUALIZADA DE LA VARIABLE GLOBAL para asegurar consistencia.
                if (clienteEscaneadoPuntosEl && window.clienteEscaneadoParaSuma) {
                    clienteEscaneadoPuntosEl.textContent = window.clienteEscaneadoParaSuma.puntos;
                } else if (clienteEscaneadoPuntosEl) {
                    // Si por alguna razón la variable global no está, intentamos leer de la UI y actualizarla.
                    // Esto es un fallback, pero la línea anterior es la principal.
                    const puntosActualesEnUI = parseInt(clienteEscaneadoPuntosEl.textContent, 10) || 0;
                    clienteEscaneadoPuntosEl.textContent = puntosActualesEnUI + puntosASumar;
                }
                // --- FIN DE LA ACTUALIZACIÓN CORRECTA ---

                // Reseteamos el formulario
                detalleSumarPuntosForm.reset();

            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error al sumar puntos en el detalle del cliente:", error);
                mostrarMensajeConAutoOcultamiento(detalleSumarPuntosMessage, `Error al sumar puntos: ${error.message}`, true);
            }
        });
    }

    

    // --- Configurar Listeners para Formularios y Botones ---

    // Formulario de Login
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = adminEmailInput.value.trim();
            const password = adminPasswordInput.value;
            mostrarMensaje(adminLoginErrorEl, "");

            try {
                await iniciarSesionAdmin(email, password);
                adminLoginForm.reset();
            } catch (error) {
                let mensajeError = obtenerMensajeErrorFirebase(error);
                if (error.code === 'auth/unauthorized-user') {
                    mensajeError = "Acceso denegado. Usuario no autorizado.";
                }
                mostrarMensaje(adminLoginErrorEl, mensajeError, true);
            }
        });
    }


    // Botón de Logout
    if (adminLogoutButton) {
        adminLogoutButton.addEventListener('click', async () => {
            try {
                await cerrarSesionAdmin();
            } catch (error) {
                console.error("Error al intentar cerrar sesión:", error);
            }
        });
    }

    // Formulario de Sumar Puntos (Manual por Email) - MODIFICADO
    if (sumarPuntosForm) {
        sumarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clienteEmail = clienteEmailInput.value.trim();
            const puntosASumar = parseInt(puntosASumarInput.value, 10);
            mostrarMensaje(sumarPuntosMessageEl, ""); // Limpiar mensaje previo

            if (!clienteEmail || isNaN(puntosASumar) || puntosASumar <= 0) {
                mostrarMensaje(sumarPuntosMessageEl, "Por favor, ingresa un email y puntos válidos.", true);
                return;
            }

            try {
                const clienteData = await buscarClientePorEmail(clienteEmail);
                if (!clienteData) {
                    mostrarMensaje(sumarPuntosMessageEl, `Cliente con email '${clienteEmail}' no encontrado.`, true);
                    return;
                }

                await sumarPuntosAFirestore(clienteData.id, puntosASumar);

                console.log(`¡${puntosASumar} puntos sumados a ${clienteEmail} con éxito!`);
                // Usamos la función con auto-ocultamiento aquí para el mensaje de éxito.
                mostrarMensajeConAutoOcultamiento(sumarPuntosMessageEl, `¡${puntosASumar} puntos sumados a ${clienteEmail} con éxito!`, false);

                sumarPuntosForm.reset();

            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error en sumar puntos manual:", error);
            }
        });
    }

    // Formulario de Sumar Puntos (Desde QR Escaneado) - MODIFICADO
    if (escanearSumarPuntosForm) {
        escanearSumarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // --- Validaciones ANTES de intentar leer el valor del input ---
            if (!puntosASumarDesdeQRInput) {
                console.error("[MAIN_ORCHESTRATOR] ERROR CRÍTICO: Referencia al input 'puntosASumarDesdeQR' no es válida.");
                mostrarMensaje(scanMessageEl, "Error interno de configuración del formulario.", true);
                return;
            }
            if (!window.clienteEscaneadoParaSuma) {
                console.log("[MAIN_ORCHESTRATOR] Intentando sumar puntos sin cliente escaneado.");
                mostrarMensaje(scanMessageEl, "Primero escanea el QR de un cliente válido.", true);
                return;
            }
            const puntosInputVal = puntosASumarDesdeQRInput.value.trim();
            if (!puntosInputVal) {
                console.log("[MAIN_ORCHESTRATOR] Campo de puntos vacío.");
                mostrarMensaje(scanMessageEl, "Por favor, ingresa una cantidad válida de puntos.", true);
                return;
            }
            const puntosASumar = parseInt(puntosInputVal, 10);
            if (isNaN(puntosASumar) || puntosASumar <= 0) {
                console.log(`[MAIN_ORCHESTRATOR] Valor de puntos inválido: '${puntosInputVal}'`);
                mostrarMensaje(scanMessageEl, "Por favor, ingresa una cantidad válida de puntos (número positivo).", true);
                return;
            }
            // --- Fin de Validaciones ---

            try {
                await sumarPuntosAFirestore(window.clienteEscaneadoParaSuma.id, puntosASumar);

                console.log(`¡${puntosASumar} puntos sumados a ${window.clienteEscaneadoParaSuma.email} con éxito!`);
                // Usamos la función con auto-ocultamiento aquí para el mensaje de éxito.
                mostrarMensajeConAutoOcultamiento(scanMessageEl, `¡${puntosASumar} puntos sumados con éxito!`, false);

                escanearSumarPuntosForm.reset();

                // Actualizamos la UI del cliente escaneado
                if (clienteEscaneadoPuntosEl) {
                    const puntosActuales = parseInt(clienteEscaneadoPuntosEl.textContent, 10) || 0;
                    clienteEscaneadoPuntosEl.textContent = puntosActuales + puntosASumar;
                    if (window.clienteEscaneadoParaSuma) {
                        window.clienteEscaneadoParaSuma.puntos = puntosActuales + puntosASumar;
                    }
                }

            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error en sumar puntos desde QR:", error);
            }
        });
    }

    async function cargarYMostrarClientes() {
        // Ocultamos el contenedor de detalle si estuviera visible
        if (clienteDetailContainer) clienteDetailContainer.style.display = 'none';
        if (clientesListContainer) clientesListContainer.style.display = 'block'; // Mostramos la tabla

        // Limpiamos el cuerpo de la tabla y mostramos un mensaje de carga
        if (clientesTableBody) clientesTableBody.innerHTML = '<tr><td colspan="3">Cargando clientes...</td></tr>';
        if (clientesMessage) mostrarMensaje(clientesMessage, ""); // Limpiamos mensajes

        try {
            // Obtenemos todos los clientes desde firestoreService
            const clientes = await obtenerTodosLosClientes(); // Necesitarás implementar esta función en firestoreService.js

            // Limpiamos el mensaje de carga
            if (clientesTableBody) clientesTableBody.innerHTML = '';
            
            if (!clientes || clientes.length === 0) {
                mostrarMensaje(clientesMessage, "No hay clientes registrados aún.", false);
                return;
            }

            // Iteramos sobre los clientes y los agregamos a la tabla
            clientes.forEach(cliente => {
                const fila = clientesTableBody.insertRow(); // Crea una nueva fila

                const emailCell = fila.insertCell();
                const puntosCell = fila.insertCell();
                const fechaCell = fila.insertCell();

                emailCell.textContent = cliente.email || 'No disponible';
                puntosCell.textContent = cliente.puntos || 0;
                fechaCell.textContent = formatearFecha(cliente.fechaRegistro) || 'No disponible'; // Usamos la función de formato

                // Hacemos que cada fila sea clickeable para ver el detalle
                fila.style.cursor = 'pointer';
                fila.addEventListener('click', () => {
                    mostrarDetalleCliente(cliente); // Llama a la función para mostrar el detalle
                });
            });

        } catch (error) {
            console.error("[MAIN_ORCHESTRATOR] Error al cargar clientes:", error);
            mostrarMensaje(clientesMessage, `Error al cargar clientes: ${error.message}`, true);
            if (clientesTableBody) clientesTableBody.innerHTML = '<tr><td colspan="3">Error al cargar clientes.</td></tr>';
        }
    }

    /**
     * Muestra el detalle de un cliente específico.
     * @param {object} cliente - Objeto con los datos del cliente.
     */
    function mostrarDetalleCliente(cliente) {
    // --- 1. Verificación de que las referencias DOM necesarias para el DETALLE existen ---
    if (!clienteDetailContainer || !clienteDetailEmail || !clienteDetailPuntos || !clienteDetailFechaRegistro) {
        console.error("[MAIN_ORCHESTRATOR] Referencias DOM para detalle de cliente no encontradas en mainAdmin.js. Revise los IDs en index.html.");
        return; // Salimos de la función si no tenemos los elementos para mostrar el detalle.
    }
    // Verificamos que se haya pasado un objeto cliente válido.
    if (!cliente) {
        console.error("[MAIN_ORCHESTRATOR] No se recibieron datos del cliente para mostrar en el detalle.");
        return; // Salimos si no hay datos del cliente.
    }
    // Verificamos que el cliente tenga al menos un ID y un email, que son datos críticos para su identificación.
    if (!cliente.id || !cliente.email) {
        console.error("[MAIN_ORCHESTRATOR] Los datos del cliente recibidos no son válidos (falta ID o email).", cliente);
        return; // Salimos si los datos básicos del cliente son inválidos.
    }
    
    // --- 2. Actualización de los elementos del DOM con la información del cliente ---
    // Asignamos el email del cliente al span correspondiente. Usamos '||' para tener un fallback si la propiedad falta.
    clienteDetailEmail.textContent = cliente.email || 'No disponible';
    // Asignamos los puntos del cliente. Si no hay puntos en el objeto 'cliente', mostramos 0.
    clienteDetailPuntos.textContent = cliente.puntos || 0;
    // Asignamos la fecha de registro, formateada. Si la función formatearFecha falla o no puede formatear, usará 'No disponible'.
    clienteDetailFechaRegistro.textContent = formatearFecha(cliente.fechaRegistro) || 'No disponible';

    // --- 3. Gestión de la visibilidad de los contenedores ---
    // Ocultamos el contenedor de la lista de clientes para mostrar solo el detalle.
    if (clientesListContainer) clientesListContainer.style.display = 'none';
    // Mostramos el contenedor con el detalle del cliente.
    clienteDetailContainer.style.display = 'block';
    
    // --- 4. Guardamos los datos del cliente seleccionado en una variable global ---
    // Esto es CRUCIAL para que operaciones posteriores (como sumar puntos manualmente)
    // sepan sobre qué cliente se está actuando.
    window.clienteEscaneadoParaSuma = cliente; 

    // --- 5. Limpieza del formulario de suma de puntos (si está presente) ---
    // Esto asegura que cuando se abre el detalle de un nuevo cliente, el campo de puntos
    // esté vacío y sin mensajes de operaciones anteriores.
    if (detalleSumarPuntosForm) {
        detalleSumarPuntosForm.reset(); // Limpia los campos del formulario (input de puntos).
    }
    if (detalleSumarPuntosMessage) {
        mostrarMensaje(detalleSumarPuntosMessage, ""); // Limpia cualquier mensaje de éxito/error previo del formulario de suma.
    }
}


function formatearFecha(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return null;
    }
    try {
        const date = timestamp.toDate();
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('es-ES', options); // Formato español: DD/MM/YYYY HH:MM
    } catch (error) {
        console.error("Error al formatear fecha:", error);
        return null;
    }
}


    // Establecer la sección inicial (login)
    mostrarSeccionAdmin('adminLoginSection');
}); // Fin de DOMContentLoaded