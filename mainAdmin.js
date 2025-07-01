// mainAdmin.js - El nuevo punto de entrada para el Panel de Admin

// --- Importaciones de Módulos ---
import { dbAdmin, onAuthStateChangedAdmin, iniciarSesionAdmin, cerrarSesionAdmin } from './modules/authService.js'; 
import { buscarClientePorUid, buscarClientePorEmail, sumarPuntosAFirestore, setFirestoreDOMReferences } from './modules/firestoreService.js';
import { mostrarMensaje, obtenerMensajeErrorFirebase } from './modules/utils.js';
// Importamos las funciones necesarias de qrScannerService
import { initializeScanner, stopScanner, mostrarInfoClienteEscaneado, ocultarInfoClienteEscaneado, setScannerDOMReferences, setSumaPuntosHandler } from './modules/qrScannerService.js';

// --- Configuración y Referencias Globales ---
let adminLoginSection, sumarPuntosSection, escanearQrSection, adminLoginForm, sumarPuntosForm, escanearSumarPuntosForm, adminLogoutButton, adminUserInfoDiv;
let adminLoginErrorEl, sumarPuntosMessageEl, clienteEmailInput, puntosASumarInput, adminEmailInput, adminPasswordInput;
let scanMessageEl, clienteEncontradoInfoDiv, clienteEscaneadoEmailEl, clienteEscaneadoPuntosEl, puntosASumarDesdeQRInput;
let btnVolverAInicio, btnMostrarSumarPuntos, btnMostrarEscanearQR; 

// --- Funciones Auxiliares del Orquestador ---

/**
 * Cambia la visibilidad de las secciones principales de la interfaz.
 * También se encarga de detener el escáner si se está saliendo de la sección del escáner.
 * @param {string} idSeccionTarget - El ID de la sección a mostrar.
 * @param {string|null} currentSectionId - Opcional: el ID de la sección que se está ocultando.
 */
function mostrarSeccionAdmin(idSeccionTarget, currentSectionId = null) {
    const seccionActualVisible = document.querySelector('.admin-card[style*="display: block"]'); 
    const esSeccionEscanearQrActual = seccionActualVisible && seccionActualVisible.id === 'escanearQrSection';
    const esSeccionDestinoEscanearQr = idSeccionTarget === 'escanearQrSection';

    // Si salimos de la sección del escáner, detenemos el escáner
    if (esSeccionEscanearQrActual && !esSeccionDestinoEscanearQr) {
        console.log("[NAV_ORCHESTRATOR] Deteniendo escáner QR al salir de la sección.");
        stopScanner(); // Usamos la función de qrScannerService
    }
    
    const todasLasSecciones = document.querySelectorAll('.admin-card'); 
    todasLasSecciones.forEach(section => section.style.display = 'none');
    const seccionSeleccionada = document.getElementById(idSeccionTarget);
    if (seccionSeleccionada) {
        seccionSeleccionada.style.display = 'block';
    }
}

// --- MANEJO DEL ESTADO DE AUTENTICACIÓN ---
function handleAuthStateChange(user) {
    // Asegurarse de que las referencias al DOM se han asignado antes de que esta función se ejecute.
    if (user) { 
        console.log("Usuario conectado:", user.email);
        mostrarSeccionAdmin('sumarPuntosSection'); 
        if (adminUserInfoDiv) adminUserInfoDiv.textContent = `Conectado como admin: ${user.email}`;
    } else { 
        console.log("Usuario desconectado.");
        mostrarSeccionAdmin('adminLoginSection'); 
        if (adminUserInfoDiv) adminUserInfoDiv.textContent = '';
        stopScanner(); // Detener el escáner si se desconecta el usuario
    }
}

// --- Inicialización y Configuración del DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM del Panel de Admin completamente cargado. Iniciando orquestador.");

    // --- Asignar Referencias al DOM ---
    adminLoginSection = document.getElementById('adminLoginSection');
    sumarPuntosSection = document.getElementById('sumarPuntosSection');
    escanearQrSection = document.getElementById('escanearQrSection'); 
    adminLoginForm = document.getElementById('adminLoginForm');
    sumarPuntosForm = document.getElementById('sumarPuntosForm');
    adminLogoutButton = document.getElementById('adminLogoutButton');
    adminUserInfoDiv = document.getElementById('adminUserInfo');
    adminLoginErrorEl = document.getElementById('adminLoginError');
    sumarPuntosMessageEl = document.getElementById('sumarPuntosMessage');
    
    // Referencias específicas para el escáner
    scanMessageEl = document.getElementById('scanMessage');
    qrScannerElement = document.getElementById('qrScannerElement'); // El div donde se renderiza el escáner
    clienteEncontradoInfoDiv = document.getElementById('clienteEncontradoInfo');
    clienteEscaneadoEmailEl = document.getElementById('clienteEscaneadoEmail');
    clienteEscaneadoPuntosEl = document.getElementById('clienteEscaneadoPuntos');
    puntosASumarDesdeQRInput = document.getElementById('puntosASumarDesdeQR');
    escanearSumarPuntosForm = document.getElementById('escanearSumarPuntosForm'); // Referencia al formulario dentro de la sección del escáner

    adminEmailInput = document.getElementById('adminEmail');
    adminPasswordInput = document.getElementById('adminPassword');
    
    clienteEmailInput = document.getElementById('clienteEmail'); 
    puntosASumarInput = document.getElementById('puntosASumar'); 
    
    btnVolverAInicio = document.getElementById('btnVolverAInicio');     
    btnMostrarSumarPuntos = document.getElementById('btnMostrarSumarPuntos'); 
    btnMostrarEscanearQR = document.getElementById('btnMostrarEscanearQR');   
    
    // --- Configurar Servicios con Referencias ---
    // Configurar referencias para firestoreService (si tiene alguna que dependa del DOM)
    setFirestoreDOMReferences(dbAdmin, { scanMessageEl: document.getElementById('scanMessage') }); 
    
    // Configurar referencias del escáner QR, incluyendo los elementos del formulario de suma de puntos
    setScannerDOMReferences({
        scanMessageEl: scanMessageEl,
        qrScannerElement: qrScannerElement,
        clienteEncontradoInfoDiv: clienteEncontradoInfoDiv,
        clienteEscaneadoEmailEl: clienteEscaneadoEmailEl,
        clienteEscaneadoPuntosEl: clienteEscaneadoPuntosEl,
        puntosASumarDesdeQRInput: puntosASumarDesdeQRInput
    });

    // --- Configurar listeners de estado de autenticación ---
    onAuthStateChangedAdmin(handleAuthStateChange);

    // --- Navegación entre secciones admin ---
    if (btnMostrarSumarPuntos) {
        btnMostrarSumarPuntos.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: sumarPuntosSection");
            mostrarSeccionAdmin('sumarPuntosSection'); 
        });
    }

    if (btnMostrarEscanearQR) {
        btnMostrarEscanearQR.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: escanearQrSection");
            mostrarSeccionAdmin('escanearQrSection'); 
            
            // --- Carga y ejecución del escáner ---
            initializeScanner(
                async (clienteUid) => { // onScanSuccess callback
                    try {
                        const clienteData = await buscarClientePorUid(clienteUid); 
                        if (clienteData) {
                            mostrarInfoClienteEscaneado(clienteData); // Muestra info en la UI
                            // El listener para sumar puntos ya está configurado en qrScannerService.js.
                            // Ahora solo habilitamos el input de puntos y el formulario se activará al hacer submit.
                            if (puntosASumarDesdeQRInput) {
                                puntosASumarDesdeQRInput.disabled = false;
                            }
                        } else {
                            mostrarMensaje(scanMessageEl, "Cliente no encontrado.", true);
                            ocultarInfoClienteEscaneado(); 
                        }
                    } catch (error) {
                        console.error("[MAIN_ORCHESTRATOR] Error al procesar cliente escaneado:", error);
                        mostrarMensaje(scanMessageEl, "Error al buscar cliente.", true);
                        ocultarInfoClienteEscaneado();
                    }
                },
                (error) => { // onScanFailure callback
                    console.error("[MAIN_ORCHESTRATOR] Fallo en el escaneo:", error);
                    // Mensajes de error más específicos se manejan dentro de initializeScanner o la propia librería.
                }
            );
        });
    }

    if (btnVolverAInicio) {
        btnVolverAInicio.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Volviendo a la sección de inicio (Sumar Puntos)");
            mostrarSeccionAdmin('sumarPuntosSection'); 
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

    // Formulario de Sumar Puntos (Manual por Email)
    if (sumarPuntosForm) {
        sumarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clienteEmail = clienteEmailInput.value.trim(); 
            const puntosASumar = parseInt(puntosASumarInput.value, 10);
            mostrarMensaje(sumarPuntosMessageEl, ""); 

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
                mostrarMensaje(sumarPuntosMessageEl, `¡${puntosASumar} puntos sumados a ${clienteEmail} con éxito!`, false);
                sumarPuntosForm.reset(); 

            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error en sumar puntos manual:", error);
                mostrarMensaje(sumarPuntosMessageEl, "Error al sumar puntos.", true);
            }
        });
    }

    // --- Configuramos el handler para la suma de puntos desde el escáner ---
    // Esta función se llama una vez para decirle al módulo del escáner cómo sumar puntos.
    setSumaPuntosHandler(async (clienteId, puntos) => {
        // Esta función es llamada desde qrScannerService.js cuando se envía el form de suma de puntos del escáner.
        if (!clienteId || isNaN(puntos) || puntos <= 0) {
            mostrarMensaje(scanMessageEl, "Por favor, ingresa una cantidad válida de puntos.", true);
            return;
        }

        try {
            await sumarPuntosAFirestore(clienteId, puntos); 
            console.log(`¡${puntos} puntos sumados a cliente ${clienteId} con éxito!`);
            mostrarMensaje(scanMessageEl, `¡${puntos} puntos sumados con éxito!`, false); 

            // Limpiamos el formulario de suma de puntos y la información del cliente escaneado.
            if (escanearSumarPuntosForm) escanearSumarPuntosForm.reset();
            ocultarInfoClienteEscaneado(); 
            stopScanner(); // Detenemos el escáner una vez que la operación fue exitosa.
            
            // Opcional: Si quieres, puedes redirigir al usuario de vuelta a la pantalla principal
            // mostrarSeccionAdmin('sumarPuntosSection');

        } catch (error) {
            console.error("[MAIN_ORCHESTRATOR] Error en sumar puntos desde QR:", error);
            mostrarMensaje(scanMessageEl, "Error al sumar puntos.", true);
        }
    });

    // Establecer la sección inicial (login)
    mostrarSeccionAdmin('adminLoginSection'); 
}); // Fin de DOMContentLoaded