// modules/firestoreService.js
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, increment, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { mostrarMensaje } from './utils.js'; // Importamos la función de utilidad

// --- Variables del Módulo ---
let dbAdmin; // Instancia de Firestore
let scanMessageEl; // Para mostrar mensajes de error relacionados con Firestore

// --- Configuración y Referencias ---

/**
 * Configura la instancia de Firestore y las referencias al DOM necesarias.
 * DEBE llamarse después de que el DOM esté cargado.
 * @param {object} dbInstance - La instancia de Firestore inicializada.
 * @param {object} refs - Un objeto con referencias del DOM.
 * @param {HTMLElement} refs.scanMessageEl - Elemento para mensajes de escaneo.
 */
export function setFirestoreDOMReferences(dbInstance, { scanMessageEl: msgEl }) {
    dbAdmin = dbInstance;
    scanMessageEl = msgEl;
}

/**
 * Busca un cliente en la base de datos por su UID.
 * @param {string} uid - El UID del cliente a buscar.
 * @returns {Promise<object|null>} - Los datos del cliente si se encuentra, o null si no.
 * @throws {Error} - Si ocurre un error durante la consulta a Firestore.
 */
export async function buscarClientePorUid(uid) {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] Error: Instancia de Firestore no configurada.");
        throw new Error("Firestore no inicializado.");
    }
    if (!uid) {
        console.error("[FIRESTORE_SERVICE] UID no proporcionado para buscar cliente.");
        throw new Error("UID de cliente no válido.");
    }

    console.log("[FIRESTORE_SERVICE] Buscando cliente con UID:", uid);
    try {
        const usuarioDocRef = doc(dbAdmin, "usuarios", uid);
        const docSnap = await getDoc(usuarioDocRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            console.log("[FIRESTORE_SERVICE] Datos del cliente encontrados:", userData);
            return {
                id: uid,
                email: userData.email || 'No disponible',
                puntos: userData.puntosFidelidad || 0
            };
        } else {
            console.warn(`[FIRESTORE_SERVICE] Cliente con UID '${uid}' no encontrado.`);
            return null; // Cliente no encontrado
        }

    } catch (error) {
        console.error("[FIRESTORE_SERVICE] Error al buscar cliente por UID:", error);
        // Podemos decidir si lanzar el error o solo mostrar un mensaje
        mostrarMensaje(scanMessageEl, "Error al buscar cliente en la base de datos. Verifique la consola.", true);
        throw error; // Relanzamos el error para que el manejador principal decida qué hacer
    }
}

/**
 * Busca un cliente por su correo electrónico.
 * @param {string} email - El correo electrónico del cliente.
 * @returns {Promise<object|null>} - Los datos del cliente (incluyendo ID) si se encuentra, o null.
 * @throws {Error} - Si ocurre un error.
 */
export async function buscarClientePorEmail(email) {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] Error: Instancia de Firestore no configurada.");
        throw new Error("Firestore no inicializado.");
    }
    if (!email) {
        console.error("[FIRESTORE_SERVICE] Email no proporcionado para buscar cliente.");
        throw new Error("Email de cliente no válido.");
    }

    console.log(`[FIRESTORE_SERVICE] Buscando cliente con email: ${email}`);
    try {
        const usuariosRef = collection(dbAdmin, "usuarios");
        const q = query(usuariosRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`[FIRESTORE_SERVICE] Cliente con email '${email}' no encontrado.`);
            return null; // Cliente no encontrado
        }

        let clienteData = null;
        querySnapshot.forEach((docFound) => { 
            clienteData = {
                id: docFound.id,
                email: email,
                puntos: docFound.data().puntosFidelidad || 0
            };
        });
        console.log(`[FIRESTORE_SERVICE] Cliente encontrado con ID: ${clienteData.id}`);
        return clienteData;

    } catch (error) {
        console.error("[FIRESTORE_SERVICE] Error al buscar cliente por email:", error);
        mostrarMensaje(scanMessageEl, "Error al buscar cliente por email. Verifique la consola.", true);
        throw error;
    }
}


/**
 * Suma una cantidad de puntos a un cliente en Firestore.
 * @param {string} clienteId - El ID del cliente.
 * @param {number} puntosASumar - La cantidad de puntos a sumar.
 * @returns {Promise<void>}
 * @throws {Error} - Si ocurre un error.
 */
export async function sumarPuntosAFirestore(clienteId, puntosASumar) {
    if (!dbAdmin) {
        console.error("[FIRESTORE_SERVICE] Error: Instancia de Firestore no configurada.");
        throw new Error("Firestore no inicializado.");
    }
    if (!clienteId || puntosASumar <= 0) {
        console.error("[FIRESTORE_SERVICE] Datos inválidos para sumar puntos.");
        throw new Error("Datos de suma de puntos inválidos.");
    }

    console.log(`[FIRESTORE_SERVICE] Sumando ${puntosASumar} puntos al cliente ID: ${clienteId}`);
    try {
        const clienteDocRef = doc(dbAdmin, "usuarios", clienteId);
        await updateDoc(clienteDocRef, {
            puntosFidelidad: increment(puntosASumar) // Usa el operador increment para sumar
        });
        console.log(`[FIRESTORE_SERVICE] Puntos sumados exitosamente al cliente ${clienteId}.`);
    } catch (error) {
        console.error(`[FIRESTORE_SERVICE] Error al sumar puntos al cliente ${clienteId}:`, error);
        mostrarMensaje(scanMessageEl, "Error al actualizar los puntos en la base de datos. Verifique la consola.", true);
        throw error;
    }
}

// Exportamos la instancia de dbAdmin para que pueda ser usada en el servicio de autenticación si es necesario.
// Debería haber una única inicialización de Firebase.
// export { dbAdmin };