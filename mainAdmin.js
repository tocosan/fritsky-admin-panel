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
 * También se encarga de detener el escáner y limpiar mensajes si se está saliendo de la sección del escáner.
 * @param {string} idSeccionTarget - El ID de la sección a mostrar.
 */
function mostrarSeccionAdmin(idSeccionTarget) {
    // Obtenemos la sección que está actualmente visible para saber de dónde venimos.
    const seccionActualVisible = document.querySelector('.admin-card[style*="display: block"]'); 
    const esSeccionEscanearQrActual = seccionActualVisible && seccionActualVisible.id === 'escanearQrSection';
    const esSeccionDestinoEscanearQr = idSeccionTarget === 'escanearQrSection';

    // Si estamos saliendo de la sección del escáner Y no vamos hacia otra sección del escáner.
    if (esSeccionEscanearQrActual && !esSeccionDestinoEscanearQr) {
        console.log("[NAV_ORCHESTRATOR] Deteniendo escáner QR y limpiando mensajes al salir de la sección.");
        stopScanner(); // Detiene el escáner QR.
        
        // --- Limpiamos cualquier mensaje de estado del escáner ---
        if (scanMessageEl) {
            mostrarMensaje(scanMessageEl, ""); // Borra el contenido del elemento de mensajes del escáner.
        }
        // --- También ocultamos la información del cliente si estaba visible ---
        ocultarInfoClienteEscaneado(); // Resetea la UI del cliente escaneado.
    }
    
    // Ocultamos todas las secciones.
    const todasLasSecciones = document.querySelectorAll('.admin-card'); 
    todasLasSecciones.forEach(section => section.style.display = 'none');
    
    // Mostramos la sección de destino.
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
        stopScanner(); // Detener el escáner si el usuario se desconecta.
        // Limpiar mensajes del escáner si se desconecta en esa sección.
        if (scanMessageEl) {
            mostrarMensaje(scanMessageEl, ""); 
        }
        ocultarInfoClienteEscaneado();
    }
}

// --- Inicialización y Configuración del DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM del Panel de Admin completamente cargado. Iniciando orquestador.");

    // --- Asignar Referencias al DOM ---
    // Secciones principales
    adminLoginSection = document.getElementById('adminLoginSection');
    sumarPuntosSection = document.getElementById('sumarPuntosSection');
    escanearQrSection = document.getElementById('escanearQrSection'); 

    // Formularios
    adminLoginForm = document.getElementById('adminLoginForm');
    sumarPuntosForm = document.getElementById('sumarPuntosForm');
    escanearSumarPuntosForm = document.getElementById('escanearSumarPuntosForm'); // Referencia al formulario dentro de la sección del escáner

    // Elementos de usuario y botones
    adminLogoutButton = document.getElementById('adminLogoutButton');
    adminUserInfoDiv = document.getElementById('adminUserInfo');
    
    // Mensajes y errores
    adminLoginErrorEl = document.getElementById('adminLoginError');
    sumarPuntosMessageEl = document.getElementById('sumarPuntosMessage');
    
    // Referencias específicas para el escáner
    scanMessageEl = document.getElementById('scanMessage');
    qrScannerElement = document.getElementById('qrScannerElement'); // El div donde se renderiza el escáner
    clienteEncontradoInfoDiv = document.getElementById('clienteEncontradoInfo');
    clienteEscaneadoEmailEl = document.getElementById('clienteEscaneadoEmail');
    clienteEscaneadoPuntosEl = document.getElementById('clienteEscaneadoPuntos');
    puntosASumarDesdeQRInput = document.getElementById('puntosASumarDesdeQR');

    // Inputs de los formularios
    adminEmailInput = document.getElementById('adminEmail');
    adminPasswordInput = document.getElementById('adminPassword');
    clienteEmailInput = document.getElementById('clienteEmail'); 
    puntosASumarInput = document.getElementById('puntosASumar'); 
    
    // Botones de navegación
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
                            // Ahora solo habilitamos el input de puntos para que el usuario pueda interactuar.
                            if (puntosASumarDesdeQRInput) {
                                puntosASumarDesdeQRInput.disabled = false;
                            }
                        } else {
                            mostrarMensaje(scanMessageEl, "Cliente no encontrado.", true);
                            ocultarInfoClienteEscaneado(); // Oculta información si el cliente no se encuentra
                        }
                    } catch (error) {
                        console.error("[MAIN_ORCHESTRATOR] Error al procesar cliente escaneado:", error);
                        mostrarMensaje(scanMessageEl, "Error al buscar cliente.", true);
                        ocultarInfoClienteEscaneado(); // Oculta información en caso de error
                    }
                },
                (error) => { // onScanFailure callback
                    console.error("[MAIN_ORCHESTRATOR] Fallo en el escaneo:", error);
                    // El mensaje de error específico se maneja dentro de qrScannerService.js o la librería.
                    // Si el error persiste, podríamos intentar limpiarlo aquí o en mostrarSeccionAdmin.
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
            mostrarMensaje(adminLoginErrorEl, ""); // Limpia errores previos

            try {
                await iniciarSesionAdmin(email, password); 
                adminLoginForm.reset(); // Resetea el formulario al iniciar sesión correctamente
            } catch (error) {
                let mensajeError = obtenerMensajeErrorFirebase(error); 
                if (error.code === 'auth/unauthorized-user') { 
                    mensajeError = "Acceso denegado. Usuario no autorizado.";
                }
                mostrarMensaje(adminLoginErrorEl, mensajeError, true); // Muestra el mensaje de error
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
            mostrarMensaje(sumarPuntosMessageEl, ""); // Limpia mensajes previos

            // Validación básica de campos
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

                // Si el cliente es encontrado, procedemos a sumar los puntos
                await sumarPuntosAFirestore(clienteData.id, puntosASumar); 

                console.log(`¡${puntosASumar} puntos sumados a ${clienteEmail} con éxito!`);
                mostrarMensaje(sumarPuntosMessageEl, `¡${puntosASumar} puntos sumados a ${clienteEmail} con éxito!`, false); // Mensaje de éxito
                sumarPuntosForm.reset(); // Resetea el formulario después de una operación exitosa

            } catch (error) {
                console.error("[MAIN_ORCHESTRATOR] Error en sumar puntos manual:", error);
                mostrarMensaje(sumarPuntosMessageEl, "Error al sumar puntos.", true); // Mensaje de error
            }
        });
    }

    // --- Configuramos el handler para la suma de puntos desde el escáner ---
    // Esta llamada le dice al módulo del escáner cuál es la función que debe ejecutar
    // cuando el usuario intenta sumar puntos desde la interfaz del escáner.
    setSumaPuntosHandler(async (clienteId, puntos) => {
        // Esta función es llamada desde qrScannerService.js cuando se envía el form de suma de puntos del escáner.
        if (!clienteId || isNaN(puntos) || puntos <= 0) {
            mostrarMensaje(scanMessageEl, "Por favor, ingresa una cantidad válida de puntos.", true);
            return;
        }

        try {
            await sumarPuntosAFirestore(clienteId, puntos); 
            console.log(`¡${puntos} puntos sumados a cliente ${clienteId} con éxito!`);
            mostrarMensaje(scanMessageEl, `¡${puntos} puntos sumados con éxito!`, false); // Mensaje de éxito

            // Limpiamos el formulario de suma de puntos y la información del cliente escaneado.
            if (escanearSumarPuntosForm) escanearSumarPuntosForm.reset();
            ocultarInfoClienteEscaneado(); // Oculta la información del cliente
            stopScanner(); // Detenemos el escáner una vez que la operación fue exitosa.
            
            // Opcional: Si quieres, puedes redirigir al usuario de vuelta a la pantalla principal
            // mostrarSeccionAdmin('sumarPuntosSection');

        } catch (error) {
            console.error("[MAIN_ORCHESTRATOR] Error en sumar puntos desde QR:", error);
            mostrarMensaje(scanMessageEl, "Error al sumar puntos.", true); // Mensaje de error
        }
    });

    // Establecer la sección inicial (login) al cargar la página
    mostrarSeccionAdmin('adminLoginSection'); 
}); // Fin de DOMContentLoaded