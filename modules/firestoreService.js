import { getFirestore, collection, query, where, getDocs, doc, updateDoc, increment, getDoc, Timestamp, orderBy } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { mostrarMensaje } from './utils.js'; // Asumo que tienes esta función en utils.js

// --- Variables del Módulo ---
let dbAdmin; // Instancia de Firestore, se inicializará en setFirestoreDOMReferences
let scanMessageEl; // Referencia al elemento donde mostrar mensajes (ej. de errores de Firestore)

// --- Configuración y Referencias ---

/**
 * Configura la instancia de Firestore y las referencias al DOM necesarias.
 * ... (tu código funcional de setFirestoreDOMReferences) ...
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

/**
 * Busca un cliente en la base de datos por su UID.
 * ... (tu código funcional de buscarClientePorUid) ...
 */
export async function buscarClientePorUid(uid) {
    if (!dbAdmin) { /* ... */ }
    if (!uid) { /* ... */ }
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
                puntos: userData.puntosFidelidad || 0,
                fechaRegistro: userData.fechaRegistro instanceof Timestamp ? userData.fechaRegistro : null
            };
        } else {
            console.warn(`[FIRESTORE_SERVICE] Cliente con UID '${uid}' no encontrado.`);
            return null;
        }
    } catch (error) {
        console.error("[FIRESTORE_SERVICE] Error al buscar cliente por UID:", error);
        mostrarMensaje(scanMessageEl, "Error al buscar cliente en la base de datos. Verifique la consola.", true);
        throw error;
    }
}

/**
 * Busca un cliente en la base de datos por su correo electrónico.
 * ... (tu código funcional de buscarClientePorEmail) ...
 */
export async function buscarClientePorEmail(email) {
    if (!dbAdmin) { /* ... */ }
    if (!email) { /* ... */ }
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
        mostrarMensaje(scanMessageEl, "Error al buscar cliente por email. Verifique la consola.", true);
        throw error;
    }
}

/**
 * Suma una cantidad de puntos a un cliente en Firestore.
 * ... (tu código funcional de sumarPuntosAFirestore) ...
 */
export async function sumarPuntosAFirestore(clienteId, puntosASumar) {
    if (!dbAdmin) { /* ... */ }
    if (!clienteId || puntosASumar <= 0) { /* ... */ }
    console.log(`[FIRESTORE_SERVICE] Sumando ${puntosASumar} puntos al cliente ID: ${clienteId}`);
    try {
        const clienteDocRef = doc(dbAdmin, "usuarios", clienteId);
        await updateDoc(clienteDocRef, {
            puntosFidelidad: increment(puntosASumar)
        });
        console.log(`[FIRESTORE_SERVICE] Puntos sumados exitosamente al cliente ${clienteId}.`);
    } catch (error) {
        console.error(`[FIRESTORE_SERVICE] Error al sumar puntos al cliente ${clienteId}:`, error);
        mostrarMensaje(scanMessageEl, "Error al actualizar los puntos en la base de datos. Verifique la consola.", true);
        throw error;
    }
}

// --- NUEVO: Función para obtener todos los clientes ---
/**
 * Obtiene todos los clientes registrados en la base de datos.
 * ... (tu código funcional de obtenerTodosLosClientes) ...
 */
export async function obtenerTodosLosClientes() { // <-- Exportada individualmente
    if (!dbAdmin) { /* ... */ }
    console.log("[FIRESTORE_SERVICE] Obteniendo todos los clientes...");
    try {
        const usuariosRef = collection(dbAdmin, "usuarios");
        const q = query(usuariosRef);
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
        mostrarMensaje(scanMessageEl, "Error al obtener la lista de clientes.", true);
        throw error;
    }
}

// --- NUEVO: Función para obtener un cliente por su ID ---
/**
 * Obtiene los datos de un cliente específico por su ID.
 * ... (tu código funcional de obtenerClientePorId) ...
 */
export async function obtenerClientePorId(clienteId) { // <-- Exportada individualmente
    if (!dbAdmin) { /* ... */ }
    if (!clienteId) { /* ... */ }
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
        mostrarMensaje(scanMessageEl, "Error al obtener detalle del cliente.", true);
        throw error;
    }
}

