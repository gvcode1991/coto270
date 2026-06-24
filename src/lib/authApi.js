const API_BASE = window.PULSO_API_URL || "/api";

export async function obtenerSesion() {
    try {
        const datos = await solicitar("/auth/me");
        return datos.usuario;
    } catch {
        return null;
    }
}

export async function iniciarSesion(credenciales) {
    return solicitar("/auth/login", {
        method: "POST",
        body: JSON.stringify(credenciales)
    });
}

export async function registrarUsuario(datos) {
    return solicitar("/auth/register", {
        method: "POST",
        body: JSON.stringify(datos)
    });
}

export async function cerrarSesion() {
    return solicitar("/auth/logout", {
        method: "POST"
    });
}

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
