import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { registrarActividad } from "./activityService.js";
import { ROLES } from "../config/permissions.js";

export async function listarUsuarios() {
    return User.find()
        .select("nombre apellido email legajo rol estado activo ultimoAcceso createdAt")
        .sort({ estado: -1, createdAt: -1 })
        .lean();
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
