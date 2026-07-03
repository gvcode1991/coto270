export function esAdmin(usuario) {
    return Boolean(usuario && usuario.rol === "admin");
}

export function puedeVerUsuarios(usuario) {
    return Boolean(usuario && ["admin", "gerente"].includes(usuario.rol));
}

export function puedeGestionarBalances(usuario) {
    return Boolean(usuario && ["admin", "referente"].includes(usuario.rol));
}

export function puedeEditarProductos(usuario) {
    return Boolean(usuario && ["admin", "referente"].includes(usuario.rol));
}

export function puedeGuardarReportes(usuario) {
    return Boolean(usuario && ["admin", "operador"].includes(usuario.rol));
}

export function puedeVerReportes(usuario) {
    return Boolean(usuario && ["admin", "gerente"].includes(usuario.rol));
}

export function puedeAnalizar(usuario) {
    return Boolean(usuario && ["admin", "gerente", "referente"].includes(usuario.rol));
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
