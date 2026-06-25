const API_BASE = window.PULSO_API_URL || "/api";

export async function obtenerSesion() {
    try {
        const datos = await solicitar("/auth/me");
        return datos.usuario;
    } catch {
        return null;
    }
}

export function iniciarSesion(credenciales) {
    return solicitar("/auth/login", {
        method: "POST",
        body: JSON.stringify(credenciales)
    });
}

export function registrarUsuario(datos) {
    return solicitar("/auth/register", {
        method: "POST",
        body: JSON.stringify(datos)
    });
}

export function recuperarPassword(datos) {
    return solicitar("/auth/recover", {
        method: "POST",
        body: JSON.stringify(datos)
    });
}

export function cerrarSesion() {
    return solicitar("/auth/logout", { method: "POST" });
}

export function obtenerSesiones() {
    return solicitar("/auth/sessions");
}

export function cerrarSesionRemota(id) {
    return solicitar(`/auth/sessions/${id}`, { method: "DELETE" });
}

export function cerrarOtrasSesiones() {
    return solicitar("/auth/sessions", { method: "DELETE" });
}

export function regenerarCodigoRecuperacion() {
    return solicitar("/auth/recovery-code", { method: "POST" });
}

export function obtenerActividad() {
    return solicitar("/auth/activity");
}

export { solicitar };

async function solicitar(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        ...opciones,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...opciones.headers
        }
    });

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo completar la operacion.");
    }
    return datos;
}
