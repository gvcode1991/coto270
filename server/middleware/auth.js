import { buscarUsuarioPorToken } from "../services/authService.js";

export async function cargarUsuario(req, res, next) {
    try {
        const token = obtenerCookie(req, nombreCookie());
        const resultado = await buscarUsuarioPorToken(token);
        req.authToken = token;
        req.usuario = resultado?.usuario || null;
        req.sesion = resultado?.sesion || null;
        next();
    } catch (error) {
        next(error);
    }
}

export function requerirUsuario(req, res, next) {
    if (req.usuario) return next();
    return res.status(401).json({ mensaje: "Inicie sesion para continuar." });
}

export function requerirAdmin(req, res, next) {
    if (req.usuario?.role === "admin") return next();
    return res.status(403).json({ mensaje: "Esta accion requiere permisos de administrador." });
}

export function establecerCookieSesion(res, token, expira) {
    const segura = process.env.SESSION_COOKIE_SECURE === "true";
    const sameSite = process.env.SESSION_COOKIE_SAME_SITE || (segura ? "None" : "Lax");
    const atributos = [
        `${nombreCookie()}=${encodeURIComponent(token)}`,
        "Path=/",
        "HttpOnly",
        `SameSite=${sameSite}`,
        `Expires=${expira.toUTCString()}`
    ];

    if (segura) atributos.push("Secure");
    res.setHeader("Set-Cookie", atributos.join("; "));
}

export function limpiarCookieSesion(res) {
    const segura = process.env.SESSION_COOKIE_SECURE === "true";
    const sameSite = process.env.SESSION_COOKIE_SAME_SITE || (segura ? "None" : "Lax");
    const atributos = [
        `${nombreCookie()}=`,
        "Path=/",
        "HttpOnly",
        `SameSite=${sameSite}`,
        "Max-Age=0"
    ];

    if (segura) atributos.push("Secure");
    res.setHeader("Set-Cookie", atributos.join("; "));
}

function obtenerCookie(req, nombre) {
    const cookies = String(req.headers.cookie || "").split(";");
    const cookie = cookies.find(item => item.trim().startsWith(`${nombre}=`));
    return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
}

function nombreCookie() {
    return process.env.SESSION_COOKIE_NAME || "pulso_session";
}
