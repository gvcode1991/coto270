import {
    autenticarUsuario,
    cerrarSesion,
    listarSesiones,
    recuperarPassword,
    regenerarRecoveryCode,
    registrarUsuario,
    revocarOtrasSesiones,
    revocarSesion
} from "../services/authService.js";
import { listarActividad } from "../services/activityService.js";
import {
    establecerCookieSesion,
    limpiarCookieSesion
} from "../middleware/auth.js";

export async function registrar(req, res, next) {
    try {
        const resultado = await registrarUsuario(req.body, contexto(req));
        if (resultado.sesion) {
            establecerCookieSesion(res, resultado.sesion.token, resultado.sesion.expira);
        }
        res.status(201).json({
            mensaje: resultado.requiereAprobacion
                ? "Cuenta creada. Un administrador debe aprobarla antes del primer ingreso."
                : "Cuenta administradora creada correctamente.",
            usuario: resultado.usuario,
            recoveryCode: resultado.recoveryCode,
            requiereAprobacion: resultado.requiereAprobacion
        });
    } catch (error) {
        next(error);
    }
}

export async function login(req, res, next) {
    try {
        const resultado = await autenticarUsuario(req.body, contexto(req));
        establecerCookieSesion(res, resultado.token, resultado.expira);
        res.json({ mensaje: "Sesion iniciada correctamente.", usuario: resultado.usuario });
    } catch (error) {
        next(error);
    }
}

export async function logout(req, res, next) {
    try {
        await cerrarSesion(req.authToken, contexto(req));
        limpiarCookieSesion(res);
        res.json({ mensaje: "Sesion cerrada correctamente." });
    } catch (error) {
        next(error);
    }
}

export function perfil(req, res) {
    res.json({ usuario: req.usuario });
}

export async function sesiones(req, res, next) {
    try {
        res.json({ sesiones: await listarSesiones(req.usuario.id, req.authToken) });
    } catch (error) {
        next(error);
    }
}

export async function eliminarSesion(req, res, next) {
    try {
        const esActual = String(req.sesion?._id) === req.params.id;
        await revocarSesion(req.usuario.id, req.params.id);
        if (esActual) limpiarCookieSesion(res);
        res.json({ mensaje: "Sesion cerrada.", sesionActual: esActual });
    } catch (error) {
        next(error);
    }
}

export async function eliminarOtrasSesiones(req, res, next) {
    try {
        const resultado = await revocarOtrasSesiones(req.usuario.id, req.authToken);
        res.json({ mensaje: `${resultado.deletedCount} sesiones cerradas.` });
    } catch (error) {
        next(error);
    }
}

export async function recuperar(req, res, next) {
    try {
        const resultado = await recuperarPassword(req.body, contexto(req));
        limpiarCookieSesion(res);
        res.json({
            mensaje: "Contrasena actualizada. Guarde su nuevo codigo de recuperacion.",
            recoveryCode: resultado.recoveryCode
        });
    } catch (error) {
        next(error);
    }
}

export async function nuevoRecoveryCode(req, res, next) {
    try {
        const recoveryCode = await regenerarRecoveryCode(req.usuario.id, contexto(req));
        res.json({
            mensaje: "Nuevo codigo generado. Guardelo en un lugar seguro.",
            recoveryCode
        });
    } catch (error) {
        next(error);
    }
}

export async function actividad(req, res, next) {
    try {
        const registros = await listarActividad({
            usuarioId: req.usuario.id,
            limite: req.query.limite
        });
        res.json({ actividad: registros });
    } catch (error) {
        next(error);
    }
}

function contexto(req) {
    return {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || ""
    };
}
