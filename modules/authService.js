// modules/authService.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js"; // Necesario para inicializar Firestore si no está ya

// --- Configuración de Firebase y Obtención de Instancias ---
// Es importante que esta configuración se haga UNA VEZ.
// Idealmente, podrías tener un archivo de configuración centralizado o pasarlo como argumento.
// Por ahora, lo mantenemos aquí para que el módulo sea autocontenido, pero considera moverlo.
const firebaseConfigAdmin = {
  apiKey: "AIzaSyAdtCPqrLrTYzyARYnScM6NLrILQzkPdXc",
  authDomain: "controlcajafritsky.firebaseapp.com",
  projectId: "controlcajafritsky",
  storageBucket: "controlcajafritsky.firebasestorage.app",
  messagingSenderId: "434045144529",
  appId: "1:434045144529:web:b6faee9bab2d408d63e4f0"
};

// Inicializar una instancia de Firebase para el admin
const adminApp = initializeApp(firebaseConfigAdmin, "FritskyAdminInstance"); 
export const adminAuth = getAuth(adminApp); 
export const dbAdmin = getFirestore(adminApp); // <-- ¡Asegúrate que esta línea tenga 'export'!


console.log("Módulo de Autenticación: Firebase inicializado!");

// --- Configuración de Autenticación ---
// Lista de correos electrónicos autorizados para ser administradores
export const correosAdminAutorizados = [
    "abattellini@gmail.com", // TU EMAIL DE ADMIN PRINCIPAL
    // "empleado1@fritsky.com",
];

// --- Funciones de Servicio de Autenticación ---

/**
 * Inicia sesión de un usuario con correo y contraseña.
 * @param {string} email - El correo electrónico del usuario.
 * @param {string} password - La contraseña del usuario.
 * @returns {Promise<object>} - La credencial del usuario si el login es exitoso.
 * @throws {Error} - Si ocurre un error durante el inicio de sesión.
 */
export async function iniciarSesionAdmin(email, password) {
    if (!correosAdminAutorizados.includes(email)) {
        const error = new Error("Acceso denegado. Usuario no autorizado.");
        error.code = 'auth/unauthorized-user'; // Código personalizado para el backend
        throw error;
    }
    try {
        console.log(`[AUTH_SERVICE] Intentando iniciar sesión como: ${email}`);
        const userCredential = await signInWithEmailAndPassword(adminAuth, email, password);
        console.log("[AUTH_SERVICE] Inicio de sesión exitoso.");
        return userCredential;
    } catch (error) {
        console.error("[AUTH_SERVICE] Error al iniciar sesión:", error);
        throw error; // Relanzamos el error para que sea manejado por quien llama
    }
}

/**
 * Cierra la sesión del usuario actual.
 * @returns {Promise<void>}
 */
export async function cerrarSesionAdmin() {
    try {
        console.log("[AUTH_SERVICE] Cerrando sesión...");
        await signOut(adminAuth);
        console.log("[AUTH_SERVICE] Sesión cerrada exitosamente.");
    } catch (error) {
        console.error("[AUTH_SERVICE] Error al cerrar sesión:", error);
        throw error;
    }
}

/**
 * Registra un listener para el estado de autenticación del usuario.
 * La función callback se ejecutará cada vez que el estado de autenticación cambie.
 * @param {function} callback - La función que se ejecutará con el objeto user (null si está desconectado).
 * @returns {function} - Una función para darse de baja del listener.
 */
export function onAuthStateChangedAdmin(callback) {
    return onAuthStateChanged(adminAuth, (user) => {
        // Aquí puedes agregar lógica adicional antes de llamar al callback,
        // como verificar si el usuario está autorizado para ser admin.
        if (user && !correosAdminAutorizados.includes(user.email)) {
            console.warn(`[AUTH_SERVICE] Usuario ${user.email} conectado pero NO AUTORIZADO como admin. Forzando cierre de sesión.`);
            cerrarSesionAdmin().catch(err => console.error("Error al forzar logout de no autorizado:", err));
            callback(null); // Llama al callback con null porque el usuario no es un admin válido.
            return;
        }
        callback(user); // Llama al callback con el usuario (o null)
    });
}