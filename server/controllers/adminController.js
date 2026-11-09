import {
    actualizarEstadoUsuario,
    actualizarRolUsuario,
    cambiarActividadUsuario,
    eliminarUsuario,
    listarUsuarios
} from "../services/adminService.js";
import { listarActividadGlobal, limpiarActividadGlobal } from "../services/activityService.js";

export async function usuarios(req, res, next) {
    try {
        res.json({ usuarios: await listarUsuarios() });
    } catch (error) {
        next(error);
    }
}

export async function cambiarEstado(req, res, next) {
    try {
        await actualizarEstadoUsuario({
            usuarioId: req.params.id,
            estado: req.body.estado,
            administrador: req.usuario,
            contexto: contexto(req)
        });
        res.json({ mensaje: "Estado actualizado." });
    } catch (error) {
        next(error);
    }
}

export async function cambiarRol(req, res, next) {
    try {
        await actualizarRolUsuario({
            usuarioId: req.params.id,
            rol: req.body.rol,
            administrador: req.usuario,
            contexto: contexto(req)
        });
        res.json({ mensaje: "Rol actualizado." });
    } catch (error) {
        next(error);
    }
}

export async function cambiarActivo(req, res, next) {
    try {
        await cambiarActividadUsuario({
            usuarioId: req.params.id,
            activo: req.body.activo,
            administrador: req.usuario,
            contexto: contexto(req)
        });
        res.json({ mensaje: "Acceso actualizado." });
    } catch (error) {
        next(error);
    }
}

export async function actividadGlobal(req, res, next) {
    try {
        res.json(await listarActividadGlobal(req.query));
    } catch (error) {
        next(error);
    }
}

export async function borrarUsuario(req, res, next) {
    try {
        await eliminarUsuario({ usuarioId: req.params.id, administrador: req.usuario, contexto: contexto(req) });
        res.json({ mensaje: "Usuario eliminado y sesiones cerradas." });
    } catch (error) {
        next(error);
    }
}

export async function borrarActividad(req, res, next) {
    try {
        const resultado = await limpiarActividadGlobal(req.usuario);
        res.json({ mensaje: `Registros eliminados: ${resultado.eliminados}.`, ...resultado });
    } catch (error) {
        next(error);
    }
}

function contexto(req) {
    return { ip: req.ip, userAgent: req.headers["user-agent"] || "" };
}
