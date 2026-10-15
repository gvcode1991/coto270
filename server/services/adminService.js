import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { registrarActividad } from "./activityService.js";
import { ROLES } from "../config/permissions.js";
import { isObjectIdOrHexString } from "mongoose";

export async function listarUsuarios() {
    return User.find()
        .select("nombre apellido email legajo rol estado activo ultimoAcceso createdAt")
        .sort({ estado: -1, createdAt: -1 })
        .lean();
}

export async function eliminarUsuario({ usuarioId, administrador, contexto }) {
    if (administrador?.rol !== "admin") throw crearError("Esta accion requiere permisos de administrador.", 403);
    if (!isObjectIdOrHexString(usuarioId)) throw crearError("Identificador de usuario no valido.", 400);
    if (String(usuarioId) === String(administrador.id)) throw crearError("No puede eliminar su propia cuenta.", 403);

    const usuario = await User.findById(usuarioId);
    if (!usuario) throw crearError("Usuario no encontrado.", 404);
    if (usuario.rol === "admin") throw crearError("No se pueden eliminar cuentas de administrador.", 403);

    // La condicion de rol evita eliminar una cuenta promovida mientras se procesa la solicitud.
    const eliminado = await User.findOneAndDelete({ _id: usuarioId, rol: { $ne: "admin" } });
    if (!eliminado) throw crearError("El usuario cambio o ya fue eliminado. Actualice la lista.", 409);
    await Session.deleteMany({ usuario: eliminado._id });
    await registrarActividad({
        usuario: administrador.id,
        tipo: "usuario_eliminado",
        detalle: `Cuenta eliminada: ${eliminado.email}.`,
        contexto
    });
    return eliminado;
}

export async function actualizarEstadoUsuario({
    usuarioId,
    estado,
    administrador,
    contexto
}) {
    if (!["aprobado", "rechazado"].includes(estado)) {
        throw crearError("Estado de usuario no valido.", 400);
    }
    const usuario = await User.findById(usuarioId);
    if (!usuario) throw crearError("Usuario no encontrado.", 404);
    if (String(usuario._id) === String(administrador.id) && estado !== "aprobado") {
        throw crearError("No puede rechazar su propia cuenta.", 400);
    }

    usuario.estado = estado;
    usuario.aprobadoPor = administrador.id;
    usuario.aprobadoEn = estado === "aprobado" ? new Date() : null;
    await usuario.save();
    if (estado !== "aprobado") await Session.deleteMany({ usuario: usuario._id });

    await registrarActividad({
        usuario,
        tipo: `usuario_${estado}`,
        detalle: `Accion realizada por ${administrador.email}.`,
        contexto
    });
    return usuario;
}

export async function actualizarRolUsuario({
    usuarioId,
    rol,
    administrador,
    contexto
}) {
    if (!ROLES.includes(rol)) throw crearError("Rol no valido.", 400);
    const usuario = await User.findById(usuarioId);
    if (!usuario) throw crearError("Usuario no encontrado.", 404);
    if (String(usuario._id) === String(administrador.id) && rol !== "admin") {
        throw crearError("No puede quitarse su propio rol de administrador.", 400);
    }

    usuario.rol = rol;
    await usuario.save();
    await registrarActividad({
        usuario,
        tipo: "rol_actualizado",
        detalle: `Rol ${rol}, asignado por ${administrador.email}.`,
        contexto
    });
    return usuario;
}

export async function cambiarActividadUsuario({
    usuarioId,
    activo,
    administrador,
    contexto
}) {
    const usuario = await User.findById(usuarioId);
    if (!usuario) throw crearError("Usuario no encontrado.", 404);
    if (String(usuario._id) === String(administrador.id) && !activo) {
        throw crearError("No puede desactivar su propia cuenta.", 400);
    }

    usuario.activo = Boolean(activo);
    await usuario.save();
    if (!usuario.activo) await Session.deleteMany({ usuario: usuario._id });
    await registrarActividad({
        usuario,
        tipo: usuario.activo ? "usuario_activado" : "usuario_desactivado",
        detalle: `Accion realizada por ${administrador.email}.`,
        contexto
    });
    return usuario;
}

function crearError(mensaje, status) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}
