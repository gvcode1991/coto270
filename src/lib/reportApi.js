const API_BASE = typeof window !== "undefined" && window.PULSO_API_URL
    ? window.PULSO_API_URL
    : "/api";

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

export async function listarReportesGuardados(pagina = 1, filtros = {}) {
    const parametros = new URLSearchParams({ pagina: String(pagina), limite: "10" });
    for (const campo of ["busqueda", "desde", "hasta"]) if (filtros[campo]) parametros.set(campo, filtros[campo]);
    const respuesta = await fetch(`${API_BASE}/reports?${parametros}`, {
        credentials: "include",
        headers: { Accept: "application/json" }
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudieron cargar los reportes.");
    }
    return datos;
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

export async function compararReportesGuardados(base, comparado) {
    const parametros = new URLSearchParams({ base, comparado });
    const respuesta = await fetch(`${API_BASE}/reports/compare?${parametros}`, {
        credentials: "include", headers: { Accept: "application/json" }
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudieron comparar los reportes.");
    if (!datos.comparacion) throw new Error("El servidor no devolvió la comparación.");
    return datos.comparacion;
}

function estadoSinConexion() {
    return {
        conectado: false,
        baseDeDatos: false,
        texto: "Modo local"
    };
}
