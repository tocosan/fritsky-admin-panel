// --- mainAdmin.js - El nuevo punto de entrada para el Panel de Admin ---

// --- Importaciones de Módulos ---
import { dbAdmin, onAuthStateChangedAdmin, iniciarSesionAdmin, cerrarSesionAdmin } from './modules/authService.js';
import { buscarClientePorUid, buscarClientePorEmail, sumarPuntosAFirestore, restarPuntosAFirestore, setFirestoreDOMReferences, obtenerTodosLosClientes, obtenerClientePorId, guardarMensajeParaEnvio } from './modules/firestoreService.js'; // ¡IMPORTANTE: Añadir guardarMensajeParaEnvio!
import { mostrarMensaje, obtenerMensajeErrorFirebase } from './modules/utils.js';

// --- Configuración y Referencias Globales del Módulo Principal ---
// Referencias al DOM para las secciones principales
let adminLoginSection, sumarPuntosSection, escanearQrSection, clientesSection, mensajesSection; // Nueva referencia
// Referencias a formularios
let adminLoginForm, sumarPuntosForm, escanearSumarPuntosForm, escanearDescontarPuntosForm, crearMensajeForm; // Nueva referencia
// Referencias a elementos de interfaz para mensajes, inputs, botones
let adminLogoutButton, adminUserInfoDiv, adminLoginErrorEl, sumarPuntosMessageEl;
let adminEmailInput, adminPasswordInput, clienteEmailInput, puntosASumarInput; // Inputs generales

// Referencias específicas para la sección de escaneo QR
let scanMessageEl, clienteEncontradoInfoDiv, clienteEscaneadoEmailEl, clienteEscaneadoPuntosEl;
let puntosASumarDesdeQRInput, puntosADescontarDesdeQRInput;
let escanearSumarPuntosFormContainer, escanearDescontarPuntosFormContainer;

// Botones para alternar formularios en la sección QR
let btnMostrarSumarFormQR, btnMostrarDescontarFormQR;

// Nuevas referencias para la sección de gestión de clientes (listado y detalle)
let clientesListContainer, clientesTable, clientesTableBody, clientesMessage;
let clienteDetailContainer, clienteDetailEmail, clienteDetailPuntos, clienteDetailFechaRegistro;
let detalleSumarPuntosForm, puntosASumarEnDetalle, detalleSumarPuntosMessage;
let detalleRestarPuntosForm, puntosARestarEnDetalle, detalleRestarPuntosMessage;

// Botones de navegación general
let btnVolverAInicio, btnMostrarSumarPuntos, btnMostrarEscanearQR, btnMostrarClientes;
let btnVolverDesdeClientes, btnCerrarClienteDetail;
let btnVolverDesdeMensajes; // Nueva referencia para volver desde la sección de mensajes

// --- NUEVAS Referencias DOM para la Sección de Mensajes ---
let mensajeDestinatariosSelect;
let mensajeContenidoTextarea;
let mensajeEnvioStatusP;
let btnMostrarMensajes;

// Variable para mantener la referencia al módulo QR cargado dinámicamente.
let qrScannerModule = null;

// Temporizador para el auto-ocultamiento de mensajes en mainAdmin.js
let autoHideMessageTimerMain = null;

// --- Funciones Auxiliares y de Orquestación ---

/**
 * Configura y muestra un mensaje en un elemento dado, programando su auto-ocultamiento.
 */
function mostrarMensajeConAutoOcultamiento(element, message, isError, duration = 3000) {
    if (!element) {
        console.error("Elemento de mensaje no disponible para mostrar:", message);
        return;
    }
    if (autoHideMessageTimerMain) {
        clearTimeout(autoHideMessageTimerMain);
    }
    mostrarMensaje(element, message, isError);
    autoHideMessageTimerMain = setTimeout(() => {
        mostrarMensaje(element, "", false);
        autoHideMessageTimerMain = null;
    }, duration);
}

/**
 * Controla la visibilidad de las secciones principales de la interfaz del administrador.
 * Si se cambia de sección, también se asegura de detener el escáner QR si estaba activo.
 * @param {string} idSeccionTarget - El ID de la sección que se desea mostrar.
 */
function mostrarSeccionAdmin(idSeccionTarget) {
    // Si el escáner QR está activo y se cambia de sección, detenerlo primero.
    if (qrScannerModule && qrScannerModule.stopScanner) {
        console.log("[NAV_ORCHESTRATOR] Deteniendo escáner QR al cambiar de sección.");
        qrScannerModule.stopScanner();
        qrScannerModule = null; // Limpiamos la referencia para forzar una recarga la próxima vez.
    }

    // Ocultar todas las secciones admin
    const todasLasSecciones = document.querySelectorAll('.admin-card'); // Asegúrate de que 'admin-card' sea la clase común de las secciones principales.
    todasLasSecciones.forEach(section => section.style.display = 'none');
    
    // Mostrar la sección seleccionada
    const seccionSeleccionada = document.getElementById(idSeccionTarget);
    if (seccionSeleccionada) {
        seccionSeleccionada.style.display = 'block';
    } else {
        console.error(`[NAV_ORCHESTRATOR] Sección con ID '${idSeccionTarget}' no encontrada.`);
    }
}

/**
 * Carga dinámicamente el módulo del escáner QR, configura sus referencias internas y expone sus funciones.
 * @returns {Promise<object|null>} Un objeto con las funciones del escáner o null si hay un error.
 */
async function loadQrScannerModule() {
    if (qrScannerModule) { // Si el módulo ya está cargado, simplemente devolvemos la referencia existente.
        return qrScannerModule;
    }

    try {
        // Cargamos el módulo dinámicamente.
        const module = await import('./modules/qrScannerService.js');
        qrScannerModule = module; // Guardamos el módulo cargado para uso posterior.

        // Obtenemos las referencias del DOM que el módulo del escáner necesita internamente.
        const qrScannerReferences = {
            scanMessageEl: document.getElementById('scanMessage'),
            qrScannerElement: document.getElementById('qrScannerElement'),
            clienteEncontradoInfoDiv: document.getElementById('clienteEncontradoInfo'),
            clienteEscaneadoEmailEl: document.getElementById('clienteEscaneadoEmail'),
            clienteEscaneadoPuntosEl: document.getElementById('clienteEscaneadoPuntos'),
            puntosASumarDesdeQRInput: document.getElementById('puntosASumarDesdeQR'),
            escanearSumarPuntosForm: document.getElementById('escanearSumarPuntosForm'),
            escanearDescontarPuntosForm: document.getElementById('escanearDescontarPuntosForm'),
            escanearSumarPuntosMessage: document.getElementById('escanearSumarPuntosMessage'),
            escanearDescontarPuntosMessage: document.getElementById('escanearDescontarPuntosMessage'),
            puntosADescontarDesdeQRInput: document.getElementById('puntosADescontarDesdeQR'),
            // Referencias a los contenedores de los formularios de sumar/descontar
            sumarPuntosFormContainer: document.getElementById('sumarPuntosFormContainer'),
            descontarPuntosFormContainer: document.getElementById('descontarPuntosFormContainer')
        };

        // Validamos que todas las referencias DOM cruciales para el módulo QR hayan sido encontradas.
        if (!qrScannerReferences.scanMessageEl || !qrScannerReferences.qrScannerElement || !qrScannerReferences.clienteEncontradoInfoDiv || !qrScannerReferences.clienteEscaneadoEmailEl || !qrScannerReferences.clienteEscaneadoPuntosEl || !qrScannerReferences.puntosASumarDesdeQRInput || !qrScannerReferences.escanearSumarPuntosForm || !qrScannerReferences.escanearDescontarPuntosForm || !qrScannerReferences.escanearSumarPuntosMessage || !qrScannerReferences.escanearDescontarPuntosMessage || !qrScannerReferences.puntosADescontarDesdeQRInput || !qrScannerReferences.sumarPuntosFormContainer || !qrScannerReferences.descontarPuntosFormContainer) {
            console.error("[MAIN_ORCHESTRATOR] ERROR CRÍTICO: No se encontraron todas las referencias DOM necesarias para el escáner. Verifique los IDs en index.html (incluyendo referencias de formularios y contenedores).");
            const msgEl = qrScannerReferences.scanMessageEl || document.getElementById('scanMessage');
            if (msgEl) mostrarMensaje(msgEl, "Error interno de configuración del escáner.", true);
            return null; // Devolvemos null si hay un error crítico de configuración.
        }

        // Llamamos a la función `setScannerDOMReferences` del módulo QR para que este las tenga disponibles.
        if (qrScannerModule.setScannerDOMReferences) {
            qrScannerModule.setScannerDOMReferences(qrScannerReferences);
        } else {
            throw new Error("setScannerDOMReferences no está exportado desde qrScannerService.js");
        }

        // Exponemos las funciones clave del módulo QR que `mainAdmin.js` necesitará para interactuar con él.
        return {
            initializeScanner: qrScannerModule.initializeScanner,
            mostrarInfoClienteEscaneado: qrScannerModule.mostrarInfoClienteEscaneado,
            ocultarInfoClienteEscaneado: qrScannerModule.ocultarInfoClienteEscaneado,
            stopScanner: qrScannerModule.stopScanner,
            // Exponemos las funciones para alternar entre los formularios de sumar/descontar
            mostrarFormularioSumar: qrScannerModule.mostrarFormularioSumar,
            mostrarFormularioDescontar: qrScannerModule.mostrarFormularioDescontar
        };

    } catch (error) {
        console.error("Error al cargar el módulo qrScannerService:", error);
        const msgEl = document.getElementById('scanMessage'); // Intentamos obtener el elemento de mensaje para mostrar el error.
        if (msgEl) mostrarMensaje(msgEl, "Error al cargar la funcionalidad de escaneo.", true);
        qrScannerModule = null; // Aseguramos que sea null si falla la carga.
        return null; // Devolvemos null en caso de error.
    }
}

// --- Inicialización de la aplicación cuando el DOM está listo ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM del Panel de Admin completamente cargado. Iniciando orquestador.");

    // --- Asignar Referencias al DOM ---
    // Secciones principales
    adminLoginSection = document.getElementById('adminLoginSection');
    sumarPuntosSection = document.getElementById('sumarPuntosSection');
    escanearQrSection = document.getElementById('escanearQrSection');
    clientesSection = document.getElementById('clientesSection');
    mensajesSection = document.getElementById('mensajesSection'); // Nueva referencia

    // Formularios
    adminLoginForm = document.getElementById('adminLoginForm');
    sumarPuntosForm = document.getElementById('sumarPuntosForm');
    escanearSumarPuntosForm = document.getElementById('escanearSumarPuntosForm');
    escanearDescontarPuntosForm = document.getElementById('escanearDescontarPuntosForm');
    crearMensajeForm = document.getElementById('crearMensajeForm'); // Nueva referencia

    // Elementos de UI del login y sección principal
    adminLogoutButton = document.getElementById('adminLogoutButton');
    adminUserInfoDiv = document.getElementById('adminUserInfo');
    adminLoginErrorEl = document.getElementById('adminLoginError');
    sumarPuntosMessageEl = document.getElementById('sumarPuntosMessage');
    adminEmailInput = document.getElementById('adminEmail');
    adminPasswordInput = document.getElementById('adminPassword');
    clienteEmailInput = document.getElementById('clienteEmail');
    puntosASumarInput = document.getElementById('puntosASumar');

    // Referencias específicas de la sección QR
    scanMessageEl = document.getElementById('scanMessage');
    clienteEncontradoInfoDiv = document.getElementById('clienteEncontradoInfo');
    clienteEscaneadoEmailEl = document.getElementById('clienteEscaneadoEmail');
    clienteEscaneadoPuntosEl = document.getElementById('clienteEscaneadoPuntos');
    puntosASumarDesdeQRInput = document.getElementById('puntosASumarDesdeQR');
    puntosADescontarDesdeQRInput = document.getElementById('puntosADescontarDesdeQR');
    escanearSumarPuntosFormContainer = document.getElementById('sumarPuntosFormContainer');
    escanearDescontarPuntosFormContainer = document.getElementById('descontarPuntosFormContainer');

    // Botones para alternar formularios en la sección QR
    btnMostrarSumarFormQR = document.getElementById('btnMostrarSumarFormQR');
    btnMostrarDescontarFormQR = document.getElementById('btnMostrarDescontarFormQR');

    // Referencias para la sección de gestión de clientes (listado y detalle)
    clientesListContainer = document.getElementById('clientesListContainer');
    clientesTable = document.getElementById('clientesTable');
    clientesTableBody = document.getElementById('clientesTableBody');
    clientesMessage = document.getElementById('clientesMessage');
    clienteDetailContainer = document.getElementById('clienteDetailContainer');
    clienteDetailEmail = document.getElementById('clienteDetailEmail');
    clienteDetailPuntos = document.getElementById('clienteDetailPuntos');
    clienteDetailFechaRegistro = document.getElementById('clienteDetailFechaRegistro');

    // Formularios y elementos de detalle de cliente
    detalleSumarPuntosForm = document.getElementById('detalleSumarPuntosForm');
    puntosASumarEnDetalle = document.getElementById('puntosASumarEnDetalle');
    detalleSumarPuntosMessage = document.getElementById('detalleSumarPuntosMessage');
    detalleRestarPuntosForm = document.getElementById('detalleRestarPuntosForm');
    puntosARestarEnDetalle = document.getElementById('puntosARestarEnDetalle');
    detalleRestarPuntosMessage = document.getElementById('detalleRestarPuntosMessage');

    // Botones de navegación general
    btnVolverAInicio = document.getElementById('btnVolverAInicio');
    btnMostrarSumarPuntos = document.getElementById('btnMostrarSumarPuntos');
    btnMostrarEscanearQR = document.getElementById('btnMostrarEscanearQR');
    btnMostrarClientes = document.getElementById('btnMostrarClientes');
    btnVolverDesdeClientes = document.getElementById('btnVolverDesdeClientes');
    btnCerrarClienteDetail = document.getElementById('btnCerrarClienteDetail');
    btnVolverDesdeMensajes = document.getElementById('btnVolverDesdeMensajes'); // Nueva referencia

    // --- NUEVAS Referencias DOM para la Sección de Mensajes ---
    mensajesSection = document.getElementById('mensajesSection');
    btnVolverDesdeMensajes = document.getElementById('btnVolverDesdeMensajes');
    crearMensajeForm = document.getElementById('crearMensajeForm');
    mensajeDestinatariosSelect = document.getElementById('mensajeDestinatarios');
    mensajeContenidoTextarea = document.getElementById('mensajeContenido');
    mensajeEnvioStatusP = document.getElementById('mensajeEnvioStatus');
    btnMostrarMensajes = document.getElementById('btnMostrarMensajes');

    
    // --- VALIDACIÓN de las referencias DOM ---
    // Validamos las referencias para las secciones y formularios principales.
    if (!adminLoginForm || !sumarPuntosForm || !escanearSumarPuntosForm || !puntosASumarDesdeQRInput || !scanMessageEl || !btnMostrarEscanearQR || !btnMostrarClientes || !clientesSection || !clientesTableBody || !clienteDetailContainer || !escanearDescontarPuntosForm || !puntosADescontarDesdeQRInput || !escanearSumarPuntosFormContainer || !escanearDescontarPuntosFormContainer || !btnMostrarSumarFormQR || !btnMostrarDescontarFormQR || !detalleRestarPuntosForm || !puntosARestarEnDetalle || !detalleRestarPuntosMessage) {
        console.error("[MAIN_ORCHESTRATOR] ERROR CRÍTICO: Algunas referencias DOM esenciales no fueron encontradas (secciones/formularios principales). Por favor, revise los IDs en index.html.");
    }
    // Validamos específicamente las referencias de la nueva sección de mensajes.
    if (!mensajesSection || !btnVolverDesdeMensajes || !crearMensajeForm || !mensajeDestinatariosSelect || !mensajeContenidoTextarea || !mensajeEnvioStatusP) {
        console.error("[MAIN_ORCHESTRATOR] ERROR CRÍTICO: No se encontraron todas las referencias DOM para la sección de mensajes. Revise los IDs en index.html.");
        // Considerar una forma de alertar al usuario si un componente crítico falla.
    }

    // --- Configurar Servicios con Referencias ---
    setFirestoreDOMReferences(dbAdmin, { scanMessageEl: scanMessageEl }); // Asegurarse que scanMessageEl es la referencia correcta si la usa firestoreService

    // --- MANEJO DEL ESTADO DE AUTENTICACIÓN ---
    function handleAuthStateChange(user) {
        console.log("[AUTH_STATE_CHANGE] Iniciando con user:", user); // <-- Añade este log
        // Actualizamos referencias si no fueron obtenidas antes (poco probable, pero seguro).
        if (!adminLoginSection) adminLoginSection = document.getElementById('adminLoginSection');
        if (!sumarPuntosSection) sumarPuntosSection = document.getElementById('sumarPuntosSection');
        if (!escanearQrSection) escanearQrSection = document.getElementById('escanearQrSection');
        if (!clientesSection) clientesSection = document.getElementById('clientesSection');
        if (!mensajesSection) mensajesSection = document.getElementById('mensajesSection');
        if (!adminUserInfoDiv) adminUserInfoDiv = document.getElementById('adminUserInfo');

        if (user) {
            console.log("Usuario conectado:", user.email);
            mostrarSeccionAdmin('sumarPuntosSection'); // Muestra la sección principal por defecto al iniciar sesión.
            if (adminUserInfoDiv) adminUserInfoDiv.textContent = `Conectado como admin: ${user.email}`;
        } else {
            console.log("Usuario desconectado.");
            mostrarSeccionAdmin('adminLoginSection'); // Muestra la sección de login si se cierra sesión.
            if (adminUserInfoDiv) adminUserInfoDiv.textContent = '';
        }
    }

    // --- Configurar listeners de estado de autenticación ---
    onAuthStateChangedAdmin(handleAuthStateChange);

    if (btnMostrarMensajes) {
        btnMostrarMensajes.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Click en btnMostrarMensajes. Navegando a mensajesSection.");
            // Aquí es IMPORTANTE que no haya nada más que la llamada a mostrarSeccionAdmin.
            // Asegurarnos de que el escáner se detenga si está activo.
            if (qrScannerModule && qrScannerModule.stopScanner) {
                qrScannerModule.stopScanner();
                qrScannerModule = null; // Limpiamos la referencia global.
            }
            // Además, también es buena práctica limpiar el estado del cliente escaneado.
            window.clienteEscaneadoParaSuma = null; 
            
            mostrarSeccionAdmin('mensajesSection');
        });
    }

    if (btnVolverDesdeMensajes) {
        btnVolverDesdeMensajes.addEventListener('click', (e) => { // Añadimos 'e' para poder prevenir comportamiento por defecto
            e.preventDefault(); // Evita cualquier comportamiento de evento por defecto del botón.
            console.log("[NAV_ORCHESTRATOR] Click detectado en btnVolverDesdeMensajes. Navegando a sumarPuntosSection.");
            
            // Asegurarnos de que la sección de mensajes se oculte ANTES de mostrar la otra.
            // Esto puede ayudar a prevenir conflictos.
            if (mensajesSection) { // Asegúrate que la referencia a mensajesSection exista
                mensajesSection.style.display = 'none';
            }
            
            // Llamamos a la función de navegación principal
            mostrarSeccionAdmin('sumarPuntosSection'); 
        });
    }

     // Listener para volver a la sección de sumar puntos (inicio)
    if (btnVolverAInicio) {
        btnVolverAInicio.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: sumarPuntosSection");
            mostrarSeccionAdmin('sumarPuntosSection');
        });
    }

    // Listener para mostrar la sección de sumar puntos (redundante con btnVolverAInicio, pero se deja por si acaso)
    if (btnMostrarSumarPuntos) {
        btnMostrarSumarPuntos.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: sumarPuntosSection");
            mostrarSeccionAdmin('sumarPuntosSection');
        });
    }

    // Listener para mostrar la sección de escaneo QR
    if (btnMostrarEscanearQR) {
        btnMostrarEscanearQR.addEventListener('click', async () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: escanearQrSection");
            mostrarSeccionAdmin('escanearQrSection');

            const scannerApi = await loadQrScannerModule(); // Esperamos a que el módulo se cargue y exponga sus funciones.

            if (!scannerApi) { // Si la carga falló o faltaron referencias críticas DENTRO del módulo.
                console.error("[MAIN_ORCHESTRATOR] Fallo al cargar el módulo QR escáner. La sección de escaneo no se inicializará correctamente.");
                return; // No continuamos si el módulo no está listo.
            }

            const {
                initializeScanner,
                mostrarInfoClienteEscaneado,
                ocultarInfoClienteEscaneado,
                stopScanner,
                mostrarFormularioSumar,
                mostrarFormularioDescontar
            } = scannerApi;

            // Restablecemos la UI del escáner antes de iniciarlo
            ocultarInfoClienteEscaneado(); // Oculta cualquier información previa de cliente
            mostrarMensaje(scanMessageEl, ""); // Limpiamos cualquier mensaje de escaneo

            // Inicializamos el escáner
            initializeScanner(
                async (clienteUid) => { // Callback onScanSuccess: mainAdmin recibe el UID
                    try {
                        console.log(`[MAIN_ORCHESTRATOR] UID recibido en onScanSuccess: ${clienteUid}`);
                        const clienteData = await buscarClientePorUid(clienteUid);
                        if (clienteData) {
                            console.log("[MAIN_ORCHESTRATOR] Cliente encontrado, pasando a mostrarInfoClienteEscaneado:", clienteData);
                            // Llamamos a la función del módulo QR para actualizar la UI.
                            // Esta función ahora también prepara los formularios.
                            mostrarInfoClienteEscaneado(clienteData);
                        } else {
                            console.warn(`[MAIN_ORCHESTRATOR] Cliente con UID ${clienteUid} no encontrado en Firestore.`);
                            mostrarMensaje(scanMessageEl, "Cliente no encontrado.", true);
                            ocultarInfoClienteEscaneado(); // Ocultar cualquier información previa.
                        }
                    } catch (error) {
                        console.error("[MAIN_ORCHESTRATOR] Error al procesar cliente escaneado:", error);
                        mostrarMensaje(scanMessageEl, `Error al buscar cliente: ${error.message}`, true);
                        ocultarInfoClienteEscaneado();
                    }
                },
                (error) => { /* Callback onScanFailure - Manejado internamente por el módulo, no se necesita acción aquí a menos que sea crítico */ }
            );
        });
    }

    // Listener para el botón "Sumar Puntos" dentro de la sección QR
    if (btnMostrarSumarFormQR) {
        btnMostrarSumarFormQR.addEventListener('click', () => {
            if (qrScannerModule && qrScannerModule.mostrarFormularioSumar) {
                console.log("[MAIN_ADMIN] Click en btnMostrarSumarFormQR");
                qrScannerModule.mostrarFormularioSumar(); // Llama a la función del módulo QR
                // Limpiamos los mensajes de los formularios para evitar confusiones
                if (escanearSumarPuntosMessage) mostrarMensaje(escanearSumarPuntosMessage, "");
                if (escanearDescontarPuntosMessage) mostrarMensaje(escanearDescontarPuntosMessage, "");
            } else {
                console.error("[MAIN_ADMIN] No se pudo llamar a mostrarFormularioSumar: Módulo QR no cargado o función no disponible.");
            }
        });
    }

    // Listener para el botón "Descontar Puntos" dentro de la sección QR
    if (btnMostrarDescontarFormQR) {
        btnMostrarDescontarFormQR.addEventListener('click', () => {
            if (qrScannerModule && qrScannerModule.mostrarFormularioDescontar) {
                console.log("[MAIN_ADMIN] Click en btnMostrarDescontarFormQR");
                qrScannerModule.mostrarFormularioDescontar(); // Llama a la función del módulo QR
                // Limpiamos los mensajes de los formularios para evitar confusiones
                if (escanearSumarPuntosMessage) mostrarMensaje(escanearSumarPuntosMessage, "");
                if (escanearDescontarPuntosMessage) mostrarMensaje(escanearDescontarPuntosMessage, "");
            } else {
                console.error("[MAIN_ADMIN] No se pudo llamar a mostrarFormularioDescontar: Módulo QR no cargado o función no disponible.");
            }
        });
    }

    // Listener para ir a la sección de gestión de clientes
    if (btnMostrarClientes) {
        btnMostrarClientes.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: clientesSection");
            mostrarSeccionAdmin('clientesSection');
            cargarYMostrarClientes(); // Cargamos los clientes al entrar en la sección.
        });
    }

    // Listener para volver desde el detalle de cliente al listado de clientes
    if (btnCerrarClienteDetail) {
        btnCerrarClienteDetail.addEventListener('click', () => {
            if (clienteDetailContainer) clienteDetailContainer.style.display = 'none';
            if (clientesListContainer) clientesListContainer.style.display = 'block';
        });
    }
    // Listener para volver desde la sección de clientes a la sección principal (sumar puntos)
    if (btnVolverDesdeClientes) {
        btnVolverDesdeClientes.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Volviendo a la sección de inicio (Sumar Puntos)");
            mostrarSeccionAdmin('sumarPuntosSection');
        });
    }

    // --- Lógica para el formulario de sumar puntos EN EL DETALLE DEL CLIENTE ---
    if (detalleSumarPuntosForm && puntosASumarEnDetalle && detalleSumarPuntosMessage) {
        detalleSumarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            mostrarMensaje(detalleSumarPuntosMessage, ""); // Limpiar mensaje previo

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

            if (!window.clienteEscaneadoParaSuma) {
                console.error("[MAIN_ORCHESTRATOR] No hay cliente seleccionado para sumar puntos.");
                mostrarMensaje(detalleSumarPuntosMessage, "Error interno: No se ha seleccionado un cliente.", true);
                return;
            }

            try {
                await sumarPuntosAFirestore(window.clienteEscaneadoParaSuma.id, puntosASumar);
                console.log(`¡${puntosASumar} puntos sumados a ${window.clienteEscaneadoParaSuma.email} con éxito!`);
                mostrarMensajeConAutoOcultamiento(detalleSumarPuntosMessage, `¡${puntosASumar} puntos sumados con éxito!`, false);

                // Actualizar la UI y los datos del cliente en el detalle.
                if (window.clienteEscaneadoParaSuma) {
                    window.clienteEscaneadoParaSuma.puntos = (window.clienteEscaneadoParaSuma.puntos || 0) + puntosASumar;
                }
                if (clienteDetailPuntos) { // Actualizar el span en el detalle
                    clienteDetailPuntos.textContent = window.clienteEscaneadoParaSuma ? window.clienteEscaneadoParaSuma.puntos : 'N/A';
                }

                detalleSumarPuntosForm.reset(); // Reseteamos el formulario
            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error al sumar puntos en el detalle del cliente:", error);
                mostrarMensajeConAutoOcultamiento(detalleSumarPuntosMessage, `Error al sumar puntos: ${error.message}`, true);
            }
        });
    }
    
    // --- LÓGICA PARA EL FORMULARIO DE RESTAR PUNTOS EN EL DETALLE DEL CLIENTE ---
    if (detalleRestarPuntosForm && puntosARestarEnDetalle && detalleRestarPuntosMessage) {
        detalleRestarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            mostrarMensaje(detalleRestarPuntosMessage, ""); // Limpiar mensaje previo

            const puntosInputVal = puntosARestarEnDetalle.value.trim();
            if (!puntosInputVal) {
                mostrarMensaje(detalleRestarPuntosMessage, "Por favor, ingresa una cantidad válida de puntos a restar.", true);
                return;
            }
            const puntosARestar = parseInt(puntosInputVal, 10);
            if (isNaN(puntosARestar) || puntosARestar <= 0) {
                mostrarMensaje(detalleRestarPuntosMessage, "Por favor, ingresa una cantidad válida de puntos a restar (número positivo).", true);
                return;
            }

            if (!window.clienteEscaneadoParaSuma) {
                console.error("[MAIN_ORCHESTRATOR] No hay cliente seleccionado para restar puntos.");
                mostrarMensaje(detalleRestarPuntosMessage, "Error interno: No se ha seleccionado un cliente.", true);
                return;
            }

            if ((window.clienteEscaneadoParaSuma.puntos || 0) < puntosARestar) {
                mostrarMensaje(detalleRestarPuntosMessage, `El cliente no tiene ${puntosARestar} puntos disponibles. Puntos actuales: ${window.clienteEscaneadoParaSuma.puntos || 0}`, true);
                return;
            }

            try {
                await restarPuntosAFirestore(window.clienteEscaneadoParaSuma.id, puntosARestar);
                console.log(`¡${puntosARestar} puntos restados a ${window.clienteEscaneadoParaSuma.email} con éxito!`);
                mostrarMensajeConAutoOcultamiento(detalleRestarPuntosMessage, `¡${puntosARestar} puntos restados con éxito!`, false);

                // Actualizar la UI y los datos del cliente en el detalle.
                if (window.clienteEscaneadoParaSuma) {
                    window.clienteEscaneadoParaSuma.puntos = (window.clienteEscaneadoParaSuma.puntos || 0) - puntosARestar;
                }
                if (clienteDetailPuntos) { // Actualizar el span en el detalle
                    clienteDetailPuntos.textContent = window.clienteEscaneadoParaSuma ? window.clienteEscaneadoParaSuma.puntos : 'N/A';
                }

                detalleRestarPuntosForm.reset(); // Reseteamos el formulario
            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error al restar puntos en el detalle del cliente:", error);
                mostrarMensajeConAutoOcultamiento(detalleRestarPuntosMessage, `Error al restar puntos: ${error.message}`, true);
            }
        });
    }
    
    // --- Formulario de Login ---
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = adminEmailInput.value.trim();
            const password = adminPasswordInput.value;
            mostrarMensaje(adminLoginErrorEl, "");

            try {
                await iniciarSesionAdmin(email, password);
                adminLoginForm.reset(); // Limpia los campos del formulario de login
            } catch (error) {
                let mensajeError = obtenerMensajeErrorFirebase(error);
                if (error.code === 'auth/unauthorized-user') { // Manejo específico para usuario no autorizado
                    mensajeError = "Acceso denegado. Usuario no autorizado.";
                }
                mostrarMensaje(adminLoginErrorEl, mensajeError, true);
            }
        });
    }

    // --- Botón de Logout ---
    if (adminLogoutButton) {
        adminLogoutButton.addEventListener('click', async () => {
            try {
                await cerrarSesionAdmin();
            } catch (error) {
                console.error("Error al intentar cerrar sesión:", error);
                // Opcional: Mostrar un mensaje de error al usuario.
            }
        });
    }

    // --- Formulario de Sumar Puntos (Manual por Email) ---
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
                mostrarMensajeConAutoOcultamiento(sumarPuntosMessageEl, `¡${puntosASumar} puntos sumados a ${clienteEmail} con éxito!`, false);
                sumarPuntosForm.reset(); // Reseteamos el formulario

            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error en sumar puntos manual:", error);
                mostrarMensajeConAutoOcultamiento(sumarPuntosMessageEl, `Error al sumar puntos: ${error.message}`, true);
            }
        });
    }

    // --- Formulario de Sumar Puntos (Desde QR Escaneado) ---
    if (escanearSumarPuntosForm) {
        escanearSumarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault();

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

            try {
                await sumarPuntosAFirestore(window.clienteEscaneadoParaSuma.id, puntosASumar);
                console.log(`¡${puntosASumar} puntos sumados a ${window.clienteEscaneadoParaSuma.email} con éxito!`);
                mostrarMensajeConAutoOcultamiento(scanMessageEl, `¡${puntosASumar} puntos sumados con éxito!`, false);
                escanearSumarPuntosForm.reset(); // Reseteamos el formulario

                // Actualizamos la UI del cliente escaneado en la sección QR
                if (clienteEscaneadoPuntosEl) {
                    const puntosActuales = parseInt(clienteEscaneadoPuntosEl.textContent, 10) || 0;
                    clienteEscaneadoPuntosEl.textContent = puntosActuales + puntosASumar;
                    if (window.clienteEscaneadoParaSuma) {
                        window.clienteEscaneadoParaSuma.puntos = puntosActuales + puntosASumar; // Actualizar también la variable global
                    }
                }

            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error en sumar puntos desde QR:", error);
                mostrarMensajeConAutoOcultamiento(scanMessageEl, `Error al sumar puntos: ${error.message}`, true);
            }
        });
    }

    // --- Formulario de Descontar Puntos (Desde QR) ---
    if (escanearDescontarPuntosForm) {
        escanearDescontarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!puntosADescontarDesdeQRInput) {
                console.error("[MAIN_ORCHESTRATOR] ERROR CRÍTICO: Referencia al input 'puntosADescontarDesdeQR' no es válida.");
                mostrarMensaje(scanMessageEl, "Error interno de configuración del formulario.", true);
                return;
            }
            if (!window.clienteEscaneadoParaSuma) {
                console.log("[MAIN_ORCHESTRATOR] Intentando descontar puntos sin cliente escaneado.");
                mostrarMensaje(scanMessageEl, "Primero escanea el QR de un cliente válido.", true);
                return;
            }
            const puntosInputVal = puntosADescontarDesdeQRInput.value.trim();
            if (!puntosInputVal) {
                console.log("[MAIN_ORCHESTRATOR] Campo de puntos a descontar vacío.");
                mostrarMensaje(scanMessageEl, "Por favor, ingresa una cantidad válida de puntos a descontar.", true);
                return;
            }
            const puntosADescontar = parseInt(puntosInputVal, 10);
            if (isNaN(puntosADescontar) || puntosADescontar <= 0) {
                console.log(`[MAIN_ORCHESTRATOR] Valor de puntos a descontar inválido: '${puntosInputVal}'`);
                mostrarMensaje(scanMessageEl, "Por favor, ingresa una cantidad válida de puntos a descontar (número positivo).", true);
                return;
            }

            // Verificamos si el cliente tiene suficientes puntos
            if ((window.clienteEscaneadoParaSuma.puntos || 0) < puntosADescontar) {
                mostrarMensaje(scanMessageEl, `El cliente no tiene ${puntosADescontar} puntos disponibles. Puntos actuales: ${window.clienteEscaneadoParaSuma.puntos || 0}`, true);
                return;
            }

            try {
                await restarPuntosAFirestore(window.clienteEscaneadoParaSuma.id, puntosADescontar);
                console.log(`¡${puntosADescontar} puntos restados a ${window.clienteEscaneadoParaSuma.email} con éxito!`);
                mostrarMensajeConAutoOcultamiento(scanMessageEl, `¡${puntosADescontar} puntos restados con éxito!`, false);
                escanearDescontarPuntosForm.reset(); // Reseteamos el formulario

                // Actualizamos la UI del cliente escaneado en la sección QR
                if (clienteEscaneadoPuntosEl) {
                    const puntosActuales = parseInt(clienteEscaneadoPuntosEl.textContent, 10) || 0;
                    clienteEscaneadoPuntosEl.textContent = puntosActuales - puntosADescontar;
                    if (window.clienteEscaneadoParaSuma) {
                        window.clienteEscaneadoParaSuma.puntos = puntosActuales - puntosADescontar; // Actualizar también la variable global
                    }
                }

            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error en descontar puntos desde QR:", error);
                mostrarMensajeConAutoOcultamiento(scanMessageEl, `Error al descontar puntos: ${error.message}`, true);
            }
        });
    }

    // --- Función para cargar y mostrar la lista de clientes ---
    async function cargarYMostrarClientes() {
        // Ocultamos el contenedor de detalle si estuviera visible y mostramos la lista.
        if (clienteDetailContainer) clienteDetailContainer.style.display = 'none';
        if (clientesListContainer) clientesListContainer.style.display = 'block';

        // Limpiamos el cuerpo de la tabla y mostramos un mensaje de carga.
        if (clientesTableBody) clientesTableBody.innerHTML = '<tr><td colspan="3">Cargando clientes...</td></tr>';
        if (clientesMessage) mostrarMensaje(clientesMessage, ""); // Limpiamos mensajes anteriores.

        try {
            // Obtenemos todos los clientes desde firestoreService.
            const clientes = await obtenerTodosLosClientes();

            // Limpiamos el mensaje de carga
            if (clientesTableBody) clientesTableBody.innerHTML = '';
            
            if (!clientes || clientes.length === 0) {
                mostrarMensaje(clientesMessage, "No hay clientes registrados aún.", false);
                return;
            }

            // Iteramos sobre los clientes y los agregamos a la tabla.
            clientes.forEach(cliente => {
                const fila = clientesTableBody.insertRow(); // Crea una nueva fila.

                const emailCell = fila.insertCell();
                const puntosCell = fila.insertCell();
                const fechaCell = fila.insertCell();

                emailCell.textContent = cliente.email || 'No disponible';
                puntosCell.textContent = cliente.puntos || 0;
                fechaCell.textContent = formatearFecha(cliente.fechaRegistro) || 'No disponible'; // Usa la función formatearFecha.

                // Hacemos que cada fila sea clickeable para ver el detalle.
                fila.style.cursor = 'pointer';
                fila.addEventListener('click', () => {
                    mostrarDetalleCliente(cliente); // Llama a la función para mostrar el detalle.
                });
            });

        } catch (error) {
            console.error("[MAIN_ORCHESTRATOR] Error al cargar clientes:", error);
            mostrarMensaje(clientesMessage, `Error al cargar clientes: ${error.message}`, true);
            if (clientesTableBody) clientesTableBody.innerHTML = '<tr><td colspan="3">Error al cargar clientes.</td></tr>';
        }
    }

    /**
     * Muestra el detalle de un cliente específico en la interfaz.
     * @param {object} cliente - Objeto con los datos del cliente.
     */
    function mostrarDetalleCliente(cliente) {
        // Verificación de que las referencias DOM necesarias para el DETALLE existen.
        if (!clienteDetailContainer || !clienteDetailEmail || !clienteDetailPuntos || !clienteDetailFechaRegistro) {
            console.error("[MAIN_ORCHESTRATOR] Referencias DOM para detalle de cliente no encontradas en mainAdmin.js. Revise los IDs en index.html.");
            return;
        }
        // Verificamos que se haya pasado un objeto cliente válido con datos críticos.
        if (!cliente || !cliente.id || !cliente.email) {
            console.error("[MAIN_ORCHESTRATOR] Los datos del cliente recibidos no son válidos (falta ID o email).", cliente);
            return;
        }
        
        // Actualización de los elementos del DOM con la información del cliente.
        clienteDetailEmail.textContent = cliente.email || 'No disponible';
        clienteDetailPuntos.textContent = cliente.puntos || 0;
        clienteDetailFechaRegistro.textContent = formatearFecha(cliente.fechaRegistro) || 'No disponible'; // Usa la función formatearFecha.

        // Gestión de la visibilidad de los contenedores: ocultar lista, mostrar detalle.
        if (clientesListContainer) clientesListContainer.style.display = 'none';
        clienteDetailContainer.style.display = 'block';
        
        // Guardamos los datos del cliente seleccionado en una variable global para operaciones posteriores.
        window.clienteEscaneadoParaSuma = cliente; 

        // Limpieza de los formularios de suma y resta de puntos del detalle.
        if (detalleSumarPuntosForm) detalleSumarPuntosForm.reset();
        if (detalleSumarPuntosMessage) mostrarMensaje(detalleSumarPuntosMessage, "");
        if (detalleRestarPuntosForm) detalleRestarPuntosForm.reset();
        if (detalleRestarPuntosMessage) mostrarMensaje(detalleRestarPuntosMessage, "");
    }

    /**
     * Formatea un timestamp de Firestore en un formato de fecha y hora legible.
     * @param {Timestamp} timestamp - El timestamp de Firestore.
     * @returns {string|null} La fecha formateada o null si el input es inválido.
     */
    function formatearFecha(timestamp) {
        if (!timestamp || typeof timestamp.toDate !== 'function') {
            return null; // Si el timestamp no es válido.
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

    // --- LÓGICA PARA LA NUEVA SECCIÓN DE MENSAJES ---

    // Listener para el envío del formulario de creación de mensaje
    if (crearMensajeForm) {
        crearMensajeForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita el envío nativo del formulario

            const destinatario = mensajeDestinatariosSelect.value;
            const contenido = mensajeContenidoTextarea.value.trim();

            // Limpiar mensajes de estado previos
            mostrarMensaje(mensajeEnvioStatusP, "");

            // Validaciones básicas
            if (!contenido) {
                mostrarMensaje(mensajeEnvioStatusP, "El contenido del mensaje no puede estar vacío.", true);
                return;
            }
            if (!destinatario) {
                mostrarMensaje(mensajeEnvioStatusP, "Debes seleccionar un destinatario.", true);
                return;
            }

            try {
                // Llamamos a la función para guardar el mensaje en Firestore.
                const mensajeId = await guardarMensajeParaEnvio(destinatario, contenido);
                
                console.log(`Mensaje guardado con ID: ${mensajeId}`);
                // Usamos la función con auto-ocultamiento para el mensaje de éxito.
                mostrarMensajeConAutoOcultamiento(mensajeEnvioStatusP, "Mensaje guardado con éxito para ser enviado.", false);
                crearMensajeForm.reset(); // Limpia el formulario después de un envío exitoso

            } catch (error) {
                console.error("Error al guardar el mensaje:", error);
                mostrarMensajeConAutoOcultamiento(mensajeEnvioStatusP, `Error al guardar el mensaje: ${error.message}`, true);
            }
        });
    }

    // --- Establecer la sección inicial al cargar la aplicación ---
    // Inicialmente, mostramos la sección de login.
    // mostrarSeccionAdmin('adminLoginSection');
    // mostrarSeccionAdmin('sumarPuntosSection');
}); // --- Fin de DOMContentLoaded ---