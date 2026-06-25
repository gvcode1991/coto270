export function esAdmin(usuario) {
    return usuario?.rol === "admin";
}

export function puedeVerUsuarios(usuario) {
    return ["admin", "gerente"].includes(usuario?.rol);
}

export function puedeGestionarBalances(usuario) {
    return ["admin", "referente"].includes(usuario?.rol);
}

export function puedeGuardarReportes(usuario) {
    return ["admin", "operador"].includes(usuario?.rol);
}

export function puedeVerReportes(usuario) {
    return ["admin", "gerente"].includes(usuario?.rol);
}

export function puedeAnalizar(usuario) {
    return ["admin", "gerente", "referente"].includes(usuario?.rol);
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
