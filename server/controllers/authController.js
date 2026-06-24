import {
    autenticarUsuario,
    cerrarSesion,
    registrarUsuario
} from "../services/authService.js";
import {
    establecerCookieSesion,
    limpiarCookieSesion
} from "../middleware/auth.js";

export async function registrar(req, res, next) {
    try {
        const resultado = await registrarUsuario(req.body);
        establecerCookieSesion(res, resultado.token, resultado.expira);
        res.status(201).json({
            mensaje: "Cuenta creada correctamente.",
            usuario: resultado.usuario
        });
    } catch (error) {
        next(error);
    }
}

export async function login(req, res, next) {
    try {
        const resultado = await autenticarUsuario(req.body);
        establecerCookieSesion(res, resultado.token, resultado.expira);
        res.json({
            mensaje: "Sesion iniciada correctamente.",
            usuario: resultado.usuario
        });
    } catch (error) {
        next(error);
    }
}

export async function logout(req, res, next) {
    try {
        await cerrarSesion(req.authToken);
        limpiarCookieSesion(res);
        res.json({ mensaje: "Sesion cerrada correctamente." });
    } catch (error) {
        next(error);
    }
}

export function perfil(req, res) {
    res.json({ usuario: req.usuario });
}
