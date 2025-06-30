// mainAdmin.js - El nuevo punto de entrada para el Panel de Admin

// --- Importaciones de Módulos ---
import { dbAdmin, onAuthStateChangedAdmin, iniciarSesionAdmin, cerrarSesionAdmin } from './modules/authService.js'; 
import { buscarClientePorUid, buscarClientePorEmail, sumarPuntosAFirestore, setFirestoreDOMReferences } from './modules/firestoreService.js';
import { mostrarMensaje, obtenerMensajeErrorFirebase } from './modules/utils.js';

// --- Configuración y Referencias Globales ---
let adminLoginSection, sumarPuntosSection, escanearQrSection, adminLoginForm, sumarPuntosForm, escanearSumarPuntosForm, adminLogoutButton, adminUserInfoDiv;
let adminLoginErrorEl, sumarPuntosMessageEl, clienteEmailInput, puntosASumarInput, adminEmailInput, adminPasswordInput;
let scannerContainer; 
let scanMessageEl, clienteEncontradoInfoDiv, clienteEscaneadoEmailEl, clienteEscaneadoPuntosEl, puntosASumarDesdeQRInput;
let btnVolverAInicio, btnMostrarSumarPuntos, btnMostrarEscanearQR; 

// Para mantener una referencia al módulo QR y sus funciones.
let qrScannerModule = null; 

// --- Funciones Auxiliares del Orquestador ---

/**
 * Cambia la visibilidad de las secciones principales de la interfaz.
 * También se encarga de detener el escáner si se está saliendo de la sección del escáner.
 * @param {string} idSeccionTarget - El ID de la sección a mostrar.
 * @param {string|null} currentSectionId - Opcional: el ID de la sección que se está ocultando.
 */
function mostrarSeccionAdmin(idSeccionTarget, currentSectionId = null) {
    // --- DETENER EL ESCÁNER SI SE ESTÁ SALIENDO DE LA SECCIÓN DEL ESCÁNER ---
    // Obtenemos la sección actual visible.
    const seccionActualVisible = document.querySelector('.admin-card[style*="display: block"]'); 
    const esSeccionEscanearQrActual = seccionActualVisible && seccionActualVisible.id === 'escanearQrSection';
    const esSeccionDestinoEscanearQr = idSeccionTarget === 'escanearQrSection';

    // Si la sección actual es la del escáner Y la sección a la que vamos NO es la del escáner
    if (esSeccionEscanearQrActual && !esSeccionDestinoEscanearQr) {
        // Intentamos detener el escáner solo si el módulo QR está cargado y tiene la función stopScanner.
        if (qrScannerModule && qrScannerModule.stopScanner) {
            console.log("[NAV_ORCHESTRATOR] Deteniendo escáner QR al salir de la sección.");
            qrScannerModule.stopScanner();
            qrScannerModule = null; // Limpiamos la referencia para asegurar un nuevo inicio la próxima vez.
        }
    }
    // --- FIN DETENER ESCÁNER ---
    
    const todasLasSecciones = document.querySelectorAll('.admin-card'); 
    todasLasSecciones.forEach(section => section.style.display = 'none');
    const seccionSeleccionada = document.getElementById(idSeccionTarget);
    if (seccionSeleccionada) {
        seccionSeleccionada.style.display = 'block';
    }
}

// Función para cargar el módulo QR y configurar sus referencias.
// Esta función es la que debe ser llamada para obtener el módulo y usarlo.
async function setupAndInitializeQrScanner() {
    if (qrScannerModule) { // Si el módulo ya se cargó y está listo
        return qrScannerModule; 
    }

    try {
        const module = await import('./modules/qrScannerService.js');
        qrScannerModule = module; // Guardamos el módulo cargado

        // Obtenemos las referencias del DOM necesarias
        const qrScannerReferences = {
            scanMessageEl: document.getElementById('scanMessage'),
            qrScannerElement: document.getElementById('qrScannerElement'), 
            clienteEncontradoInfoDiv: document.getElementById('clienteEncontradoInfo'),
            clienteEscaneadoEmailEl: document.getElementById('clienteEscaneadoEmail'),
            clienteEscaneadoPuntosEl: document.getElementById('clienteEscaneadoPuntos'),
            puntosASumarDesdeQRInput: document.getElementById('puntosASumarDesdeQR')
        };

        // Configuramos las referencias una vez que el módulo está disponible
        if (qrScannerModule.setScannerDOMReferences) {
            qrScannerModule.setScannerDOMReferences(qrScannerReferences);
        } else {
            throw new Error("setScannerDOMReferences no está exportado desde qrScannerService.js");
        }

        return qrScannerModule; 
    } catch (error) {
        console.error("Error al cargar el módulo qrScannerService:", error);
        mostrarMensaje(document.getElementById('scanMessage'), "Error al cargar la funcionalidad de escaneo.", true);
        qrScannerModule = null; // Aseguramos que sea null si falla la carga
        return null; 
    }
}


// --- MANEJO DEL ESTADO DE AUTENTICACIÓN ---
function handleAuthStateChange(user) {
    if (!adminLoginSection) adminLoginSection = document.getElementById('adminLoginSection');
    if (!sumarPuntosSection) sumarPuntosSection = document.getElementById('sumarPuntosSection');
    if (!escanearQrSection) escanearQrSection = document.getElementById('escanearQrSection'); 
    if (!adminUserInfoDiv) adminUserInfoDiv = document.getElementById('adminUserInfo');

    if (user) { 
        console.log("Usuario conectado:", user.email);
        mostrarSeccionAdmin('sumarPuntosSection'); 
        if (adminUserInfoDiv) adminUserInfoDiv.textContent = `Conectado como admin: ${user.email}`;
    } else { 
        console.log("Usuario desconectado.");
        mostrarSeccionAdmin('adminLoginSection'); 
        if (adminUserInfoDiv) adminUserInfoDiv.textContent = '';
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
    escanearSumarPuntosForm = document.getElementById('escanearSumarPuntosForm'); 
    adminLogoutButton = document.getElementById('adminLogoutButton');
    adminUserInfoDiv = document.getElementById('adminUserInfo');
    adminLoginErrorEl = document.getElementById('adminLoginError');
    sumarPuntosMessageEl = document.getElementById('sumarPuntosMessage');
    
    // Las referencias específicas del escáner se obtendrán dentro de setupAndInitializeQrScanner()

    adminEmailInput = document.getElementById('adminEmail');
    adminPasswordInput = document.getElementById('adminPassword');
    
    clienteEmailInput = document.getElementById('clienteEmail'); 
    puntosASumarInput = document.getElementById('puntosASumar'); 
    
    btnVolverAInicio = document.getElementById('btnVolverAInicio');     
    btnMostrarSumarPuntos = document.getElementById('btnMostrarSumarPuntos'); 
    btnMostrarEscanearQR = document.getElementById('btnMostrarEscanearQR');   
    
    // --- Configurar Servicios con Referencias ---
    setFirestoreDOMReferences(dbAdmin, { scanMessageEl: document.getElementById('scanMessage') }); 

    // --- Configurar listeners de estado de autenticación ---
    onAuthStateChangedAdmin(handleAuthStateChange);

    // --- Navegación entre secciones admin ---
    if (btnMostrarSumarPuntos) {
        btnMostrarSumarPuntos.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: sumarPuntosSection");
            mostrarSeccionAdmin('sumarPuntosSection'); // Detiene el escáner si estaba activo.
        });
    }

    if (btnMostrarEscanearQR) {
        btnMostrarEscanearQR.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Mostrando sección: escanearQrSection");
            mostrarSeccionAdmin('escanearQrSection'); // Detiene el escáner si estaba activo y cambia la sección.
            
            // --- Carga y ejecución del escáner ---
            setupAndInitializeQrScanner() // Carga el módulo y configura referencias si es necesario
                .then(({ initializeScanner, mostrarInfoClienteEscaneado, ocultarInfoClienteEscaneado }) => {
                    // Verificaciones de seguridad
                    if (!initializeScanner || !mostrarInfoClienteEscaneado || !ocultarInfoClienteEscaneado) {
                        console.error("Funciones del módulo QR escáner no disponibles después de la carga.");
                        mostrarMensaje(document.getElementById('scanMessage'), "No se pudieron cargar las funciones del escáner.", true);
                        return; 
                    }

                    ocultarInfoClienteEscaneado(); 
                    mostrarMensaje(document.getElementById('scanMessage'), "");
                    
                    initializeScanner(
                        async (clienteUid) => {
                            try {
                                const clienteData = await buscarClientePorUid(clienteUid); 
                                if (clienteData) {
                                    mostrarInfoClienteEscaneado(clienteData); 
                                } else {
                                    mostrarMensaje(document.getElementById('scanMessage'), "Cliente no encontrado.", true);
                                    ocultarInfoClienteEscaneado(); 
                                }
                            } catch (error) {
                                console.error("[NAV_ORCHESTRATOR] Error al procesar cliente escaneado:", error);
                            }
                        },
                        (error) => {
                            // No mostramos el error repetitivo de "no se pudo detectar" aquí.
                        }
                    );
                })
                .catch(error => {
                    console.error("Error en el proceso de escaneo:", error);
                });
        });
    }

    if (btnVolverAInicio) {
        btnVolverAInicio.addEventListener('click', () => {
            console.log("[NAV_ORCHESTRATOR] Volviendo a la sección de inicio (Sumar Puntos)");
            mostrarSeccionAdmin('sumarPuntosSection'); // Detiene el escáner si estaba activo.
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
            }
        });
    }

    // Formulario de Sumar Puntos (Desde QR Escaneado)
    if (escanearSumarPuntosForm) {
        escanearSumarPuntosForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const puntosASumar = parseInt(puntosASumarDesdeQRInput.value, 10);
            
            if (!window.clienteEscaneadoParaSuma) { 
                mostrarMensaje(scanMessageEl, "Primero escanea el QR de un cliente válido.", true);
                return;
            }
            if (isNaN(puntosASumar) || puntosASumar <= 0) {
                mostrarMensaje(scanMessageEl, "Por favor, ingresa una cantidad válida de puntos.", true);
                return;
            }
            
            try {
                await sumarPuntosAFirestore(window.clienteEscaneadoParaSuma.id, puntosASumar); 

                console.log(`¡${puntosASumar} puntos sumados a ${window.clienteEscaneadoParaSuma.email} con éxito!`);
                mostrarMensaje(scanMessageEl, `¡${puntosASumar} puntos sumados con éxito!`, false); 
                escanearSumarPuntosForm.reset(); 
                
                if (clienteEscaneadoPuntosEl) {
                    clienteEscaneadoPuntosEl.textContent = (window.clienteEscaneadoParaSuma.puntos || 0) + puntosASumar;
                    window.clienteEscaneadoParaSuma.puntos += puntosASumar; 
                }

            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error en sumar puntos desde QR:", error);
            }
        });
    }

    // Establecer la sección inicial (login)
    mostrarSeccionAdmin('adminLoginSection'); 
}); // Fin de DOMContentLoaded