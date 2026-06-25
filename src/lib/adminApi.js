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

export function actualizarRol(id, role) {
    return solicitar(`/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role })
    });
}

export function actualizarAcceso(id, activo) {
    return solicitar(`/admin/users/${id}/access`, {
        method: "PATCH",
        body: JSON.stringify({ activo })
    });
}

export function obtenerActividadGlobal() {
    return solicitar("/admin/activity");
}
