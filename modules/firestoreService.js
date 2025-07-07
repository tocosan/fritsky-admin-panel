// --- modules/firestoreService.js ---

// --- Importaciones de Firebase Firestore ---
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, increment, getDoc, Timestamp, orderBy, addDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { mostrarMensaje } from './utils.js'; // Asegúrate que esta ruta sea correcta

// --- Variables del Módulo ---
let dbAdmin; // Instancia de la base de datos Firestore
let scanMessageEl; // Referencia DOM para mostrar mensajes en la sección de escaneo (usada por otras funciones)

// --- Configuración y Referencias ---
/**
 * Configura la instancia de Firestore y referencias DOM necesarias para los servicios de Firestore.
 * @param {Firestore} dbInstance - La instancia de Firestore inicializada.
 * @param {object} refs - Un objeto con referencias DOM relevantes.
 */
export function setFirestoreDOMReferences(dbInstance, { scanMessageEl: msgEl }) {
    dbAdmin = dbInstance;
    scanMessageEl = msgEl;
    
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] ERROR CRÍTICO: La instancia de Firestore no fue proporcionada o no es válida.");
        if (scanMessageEl) mostrarMensaje(scanMessageEl, "Error fatal: Base de datos no inicializada.", true);
    } else {
        console.log("[FIRESTORE_SERVICE] Instancia de Firestore y referencias DOM configuradas.");
    }
}

// --- Funciones para Manejo de Clientes ---

/**
 * Busca un cliente en la base de datos por su UID.
 * @param {string} uid - El UID del usuario.
 * @returns {Promise<object|null>} Objeto con datos del cliente o null si no se encuentra.
 */
export async function buscarClientePorUid(uid) {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] La instancia de Firestore no está disponible.");
        return null;
    }
    if (!uid) {
        console.error("[FIRESTORE_SERVICE] Se requiere un UID para buscar cliente.");
        return null;
    }
    console.log("[FIRESTORE_SERVICE] Buscando cliente con UID:", uid);
    try {
        const usuarioDocRef = doc(dbAdmin, "usuarios", uid); // Asume que la colección se llama "usuarios"
        const docSnap = await getDoc(usuarioDocRef);
        if (docSnap.exists()) {
            const userData = docSnap.data();
            console.log("[FIRESTORE_SERVICE] Datos del cliente encontrados:", userData);
            return {
                id: uid,
                email: userData.email || 'No disponible',
                puntos: userData.puntosFidelidad || 0,
                fechaRegistro: userData.fechaRegistro instanceof Timestamp ? userData.fechaRegistro : null
            };
        } else {
            console.warn(`[FIRESTORE_SERVICE] Cliente con UID '${uid}' no encontrado.`);
            return null;
        }
    } catch (error) {
        console.error("[FIRESTORE_SERVICE] Error al buscar cliente por UID:", error);
        if (scanMessageEl) mostrarMensaje(scanMessageEl, "Error al buscar cliente en la base de datos. Verifique la consola.", true);
        throw error;
    }
}

/**
 * Busca un cliente en la base de datos por su correo electrónico.
 * @param {string} email - El correo electrónico del cliente.
 * @returns {Promise<object|null>} Objeto con datos del cliente o null si no se encuentra.
 */
export async function buscarClientePorEmail(email) {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] La instancia de Firestore no está disponible.");
        return null;
    }
    if (!email) {
        console.error("[FIRESTORE_SERVICE] Se requiere un email para buscar cliente.");
        return null;
    }
    console.log(`[FIRESTORE_SERVICE] Buscando cliente con email: ${email}`);
    try {
        const usuariosRef = collection(dbAdmin, "usuarios");
        const q = query(usuariosRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.warn(`[FIRESTORE_SERVICE] Cliente con email '${email}' no encontrado.`);
            return null;
        }
        let clienteData = null;
        // Firestore puede devolver múltiples docs si el email no es único, pero aquí esperamos uno.
        querySnapshot.forEach((docFound) => {
            const data = docFound.data();
            clienteData = {
                id: docFound.id,
                email: email,
                puntos: data.puntosFidelidad || 0,
                fechaRegistro: data.fechaRegistro instanceof Timestamp ? data.fechaRegistro : null
            };
        });
        console.log(`[FIRESTORE_SERVICE] Cliente encontrado con ID: ${clienteData.id}`);
        return clienteData;
    } catch (error) {
        console.error("[FIRESTORE_SERVICE] Error al buscar cliente por email:", error);
        if (scanMessageEl) mostrarMensaje(scanMessageEl, "Error al buscar cliente por email. Verifique la consola.", true);
        throw error;
    }
}

/**
 * Suma una cantidad de puntos a un cliente en Firestore.
 * @param {string} clienteId - El ID del cliente.
 * @param {number} puntosASumar - La cantidad de puntos a sumar.
 * @returns {Promise<void>}
 */
export async function sumarPuntosAFirestore(clienteId, puntosASumar) {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] La instancia de Firestore no está disponible.");
        throw new Error("Firestore no inicializado.");
    }
    if (!clienteId || puntosASumar <= 0) {
        console.error("[FIRESTORE_SERVICE] ID de cliente o puntos a sumar inválidos.");
        throw new Error("Datos inválidos para sumar puntos.");
    }
    console.log(`[FIRESTORE_SERVICE] Sumando ${puntosASumar} puntos al cliente ID: ${clienteId}`);
    try {
        const clienteDocRef = doc(dbAdmin, "usuarios", clienteId);
        await updateDoc(clienteDocRef, {
            puntosFidelidad: increment(puntosASumar)
        });
        console.log(`[FIRESTORE_SERVICE] Puntos sumados exitosamente al cliente ${clienteId}.`);
    } catch (error) {
        console.error(`[FIRESTORE_SERVICE] Error al sumar puntos al cliente ${clienteId}:`, error);
        // Nota: scanMessageEl puede no estar definido o ser irrelevante si este error ocurre en el detalle del cliente.
        // Sería mejor que la UI que llama a esta función maneje el error.
        throw error;
    }
}

/**
 * Resta una cantidad de puntos a un cliente en Firestore.
 * @param {string} clienteId - El ID del cliente.
 * @param {number} puntosARestar - La cantidad de puntos a restar.
 * @returns {Promise<void>}
 */
export async function restarPuntosAFirestore(clienteId, puntosARestar) {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] La instancia de Firestore no está disponible.");
        throw new Error("Firestore no inicializado.");
    }
    if (!clienteId || puntosARestar <= 0) {
        console.error("[FIRESTORE_SERVICE] ID de cliente o puntos a restar inválidos.");
        throw new Error("Datos inválidos para restar puntos.");
    }
    console.log(`[FIRESTORE_SERVICE] Restando ${puntosARestar} puntos al cliente ID: ${clienteId}`);
    try {
        const clienteDocRef = doc(dbAdmin, "usuarios", clienteId);
        await updateDoc(clienteDocRef, {
            puntosFidelidad: increment(-puntosARestar) // Usamos -puntosARestar para restar
        });
        console.log(`[FIRESTORE_SERVICE] Puntos restados exitosamente al cliente ${clienteId}.`);
    } catch (error) {
        console.error(`[FIRESTORE_SERVICE] Error al restar puntos al cliente ${clienteId}:`, error);
        throw error;
    }
}

/**
 * Obtiene todos los clientes registrados en la base de datos.
 * @returns {Promise<Array<object>>} Un array de objetos cliente.
 */
export async function obtenerTodosLosClientes() {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] La instancia de Firestore no está disponible.");
        return [];
    }
    console.log("[FIRESTORE_SERVICE] Obteniendo todos los clientes...");
    try {
        const usuariosRef = collection(dbAdmin, "usuarios");
        const q = query(usuariosRef, orderBy("email")); // Opcional: ordenar por email
        const querySnapshot = await getDocs(q);
        const clientes = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            clientes.push({
                id: doc.id,
                email: data.email || 'No disponible',
                puntos: data.puntosFidelidad || 0,
                fechaRegistro: data.fechaRegistro instanceof Timestamp ? data.fechaRegistro : null
            });
        });
        console.log(`[FIRESTORE_SERVICE] Se encontraron ${clientes.length} clientes.`);
        return clientes;
    } catch (error) {
        console.error("[FIRESTORE_SERVICE] Error al obtener todos los clientes:", error);
        throw error;
    }
}

/**
 * Obtiene los datos de un cliente específico por su ID.
 * @param {string} clienteId - El ID del cliente.
 * @returns {Promise<object|null>} Datos del cliente o null si no se encuentra.
 */
export async function obtenerClientePorId(clienteId) {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] La instancia de Firestore no está disponible.");
        return null;
    }
    if (!clienteId) {
        console.error("[FIRESTORE_SERVICE] Se requiere un ID de cliente.");
        return null;
    }
    console.log(`[FIRESTORE_SERVICE] Obteniendo cliente por ID: ${clienteId}`);
    try {
        const usuarioDocRef = doc(dbAdmin, "usuarios", clienteId);
        const docSnap = await getDoc(usuarioDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: clienteId,
                email: data.email || 'No disponible',
                puntos: data.puntosFidelidad || 0,
                fechaRegistro: data.fechaRegistro instanceof Timestamp ? data.fechaRegistro : null
            };
        } else {
            console.warn(`[FIRESTORE_SERVICE] Cliente con ID '${clienteId}' no encontrado.`);
            return null;
        }
    } catch (error) {
        console.error(`[FIRESTORE_SERVICE] Error al obtener cliente por ID ${clienteId}:`, error);
        throw error;
    }
}

// --- NUEVA FUNCIÓN para guardar mensajes ---
/**
 * Guarda un mensaje en Firestore para ser enviado posteriormente (ej. por un proceso de notificaciones).
 * @param {string} destinatario - A quién va dirigido el mensaje (ej. "todos").
 * @param {string} contenido - El texto del mensaje.
 * @returns {Promise<string>} El ID del documento del mensaje guardado.
 */
export async function guardarMensajeParaEnvio(destinatario, contenido) {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] La instancia de Firestore no está disponible.");
        throw new Error("Firestore no inicializado.");
    }
    if (!destinatario || !contenido) {
        console.error("[FIRESTORE_SERVICE] Destinatario y contenido son requeridos.");
        throw new Error("Datos inválidos para guardar mensaje.");
    }
    
    console.log(`[FIRESTORE_SERVICE] Guardando mensaje: Para '${destinatario}', Contenido: "${contenido}"`);

    try {
        // Referencia a la colección donde se guardarán los mensajes. Si no existe, Firestore la creará.
        const mensajesRef = collection(dbAdmin, "mensajes"); 
        const nuevoMensaje = {
            destinatario: destinatario,
            contenido: contenido,
            fechaCreacion: Timestamp.now(), // Marca de tiempo del momento de creación
            estado: 'pendiente', // Estado inicial: pendiente de ser procesado por el sistema de notificaciones
            enviadoA: [] // Array para registrar a qué clientes específicos se ha enviado finalmente la notificación push
        };

        const docRef = await addDoc(mensajesRef, nuevoMensaje);
        console.log("[FIRESTORE_SERVICE] Mensaje guardado con ID:", docRef.id);
        return docRef.id; // Devuelve el ID del mensaje guardado

    } catch (error) {
        console.error("[FIRESTORE_SERVICE] Error al guardar el mensaje:", error);
        // Re-lanzamos el error para que el componente que llamó a esta función lo maneje.
        throw error;
    }
}