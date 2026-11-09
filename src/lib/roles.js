export const ROLES = ["admin", "gerente", "referente", "operador"];

const PERMISOS_POR_ROL = {
    admin: ["*"],
    gerente: ["reportes:ver", "usuarios:ver", "analisis:ver"],
    referente: ["balances:gestionar", "analisis:ver"],
    operador: ["reportes:cargar"]
};

export function permisosDelRol(rol) {
    return [...(PERMISOS_POR_ROL[rol] || [])];
}

export function tienePermiso(usuario, permiso) {
    const permisos = permisosDelRol(usuario?.rol);
    return permisos.includes("*") || permisos.includes(permiso);
}
