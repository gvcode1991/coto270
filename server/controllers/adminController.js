import {
    actualizarEstadoUsuario,
    actualizarRolUsuario,
    cambiarActividadUsuario,
    listarUsuarios
} from "../services/adminService.js";
import { listarActividad } from "../services/activityService.js";

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
            role: req.body.role,
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
        res.json({
            actividad: await listarActividad({ esAdmin: true, limite: req.query.limite })
        });
    } catch (error) {
        next(error);
    }
}

function contexto(req) {
    return { ip: req.ip, userAgent: req.headers["user-agent"] || "" };
}
