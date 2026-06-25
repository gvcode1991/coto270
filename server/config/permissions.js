export const ROLES = ["admin", "gerente", "referente", "operador"];

const PERMISOS_POR_ROL = {
    admin: ["*"],
    gerente: ["reportes:ver", "usuarios:ver"],
    referente: ["balances:gestionar", "productos:editar"],
    operador: ["reportes:cargar"]
};

export function tienePermiso(usuario, permiso) {
    const permisos = PERMISOS_POR_ROL[usuario?.rol] || [];
    return permisos.includes("*") || permisos.includes(permiso);
}

export function permisosDelRol(rol) {
    return PERMISOS_POR_ROL[rol] || [];
}
