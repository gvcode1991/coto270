const API_BASE = window.PULSO_API_URL || "/api";

export async function consultarEstadoBackend() {
    try {
        const respuesta = await fetch(`${API_BASE}/health`, {
            credentials: "include",
            headers: { Accept: "application/json" }
        });
        if (!respuesta.ok) return estadoSinConexion();

        const datos = await respuesta.json();
        return {
            conectado: true,
            baseDeDatos: datos.baseDeDatos === "conectado",
            texto: datos.baseDeDatos === "conectado"
                ? "Historial disponible"
                : "Servidor activo sin MongoDB"
        };
    } catch {
        return estadoSinConexion();
    }
}

export async function guardarReporteEnBackend(nombreArchivo, productos) {
    const respuesta = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            nombreArchivo,
            productos
        })
    });

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo guardar el reporte.");
    }

    return datos;
}

export async function listarReportesGuardados() {
    const respuesta = await fetch(`${API_BASE}/reports`, {
        credentials: "include",
        headers: { Accept: "application/json" }
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudieron cargar los reportes.");
    }
    return datos.reportes || [];
}

export async function obtenerReporteGuardado(id) {
    const respuesta = await fetch(`${API_BASE}/reports/${id}`, {
        credentials: "include",
        headers: { Accept: "application/json" }
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo abrir el reporte.");
    }
    return datos.reporte;
}

function estadoSinConexion() {
    return {
        conectado: false,
        baseDeDatos: false,
        texto: "Modo local"
    };
}
