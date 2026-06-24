const API_BASE = window.PULSO_API_URL || "/api";

export async function listarBalances() {
    return solicitar("/balances");
}

export async function guardarBalance(balance) {
    return solicitar("/balances", {
        method: "POST",
        body: JSON.stringify(balance)
    });
}

export async function eliminarBalance(id) {
    return solicitar(`/balances/${id}`, {
        method: "DELETE"
    });
}

async function solicitar(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        ...opciones,
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
