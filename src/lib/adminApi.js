import { solicitar } from "./authApi.js";

export function obtenerUsuarios() {
    return solicitar("/admin/users");
}

export function actualizarEstado(id, estado) {
    return solicitar(`/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ estado })
    });
}

export function actualizarRol(id, rol) {
    return solicitar(`/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ rol })
    });
}

export function actualizarAcceso(id, activo) {
    return solicitar(`/admin/users/${id}/access`, {
        method: "PATCH",
        body: JSON.stringify({ activo })
    });
}

export function obtenerActividadGlobal(pagina = 1) {
    return solicitar(`/admin/activity?pagina=${pagina}&limite=10`);
}

export function eliminarUsuario(id) {
    return solicitar(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function limpiarRegistros() {
    return solicitar("/admin/activity", { method: "DELETE" });
}
