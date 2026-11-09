import { tienePermiso } from "./roles.js";

export function esAdmin(usuario) {
    return Boolean(usuario && usuario.rol === "admin");
}

export function puedeVerUsuarios(usuario) {
    return tienePermiso(usuario, "usuarios:ver");
}

export function puedeGestionarBalances(usuario) {
    return tienePermiso(usuario, "balances:gestionar");
}

export function puedeGuardarReportes(usuario) {
    return tienePermiso(usuario, "reportes:cargar");
}

export function puedeVerReportes(usuario) {
    return tienePermiso(usuario, "reportes:ver");
}

export function puedeAnalizar(usuario) {
    return tienePermiso(usuario, "analisis:ver");
}

export function etiquetaRol(rol) {
    const etiquetas = {
        admin: "Administrador",
        gerente: "Gerente",
        referente: "Referente",
        operador: "Operador"
    };
    return etiquetas[rol] || "Operador";
}
