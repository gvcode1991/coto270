const API_BASE = typeof window !== "undefined" && window.PULSO_API_URL
    ? window.PULSO_API_URL
    : "/api";

export async function listarCatalogo(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
    if (filtros.categoria) params.set("categoria", filtros.categoria);
    if (filtros.activo) params.set("activo", filtros.activo);

    const query = params.toString();
    return solicitar(`/catalog${query ? `?${query}` : ""}`);
}

export async function guardarProductoCatalogo(producto) {
    return solicitar("/catalog", {
        method: "POST",
        body: JSON.stringify(producto)
    });
}

export async function importarProductosCatalogo(productos) {
    return solicitar("/catalog/import", {
        method: "POST",
        body: JSON.stringify({ productos })
    });
}

export async function eliminarProductoCatalogo(plu) {
    return solicitar(`/catalog/${encodeURIComponent(plu)}`, {
        method: "DELETE"
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
