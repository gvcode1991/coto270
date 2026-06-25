import {
    createHash,
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual
} from "node:crypto";
import bcrypt from "bcrypt";
import { promisify } from "node:util";
import { permisosDelRol } from "../config/permissions.js";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { registrarActividad } from "./activityService.js";

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 7;
const BCRYPT_ROUNDS = 12;

export async function registrarUsuario(datos, contexto = {}) {
    const nombre = String(datos.nombre || "").trim();
    const apellido = String(datos.apellido || "").trim();
    const email = normalizarEmail(datos.email);
    const password = validarPassword(datos.password);

    if (nombre.length < 2) throw crearError("Ingrese un nombre valido.", 400);
    if (apellido.length < 2) throw crearError("Ingrese un apellido valido.", 400);
    if (await User.exists({ email })) {
        throw crearError("Ya existe una cuenta con ese correo.", 409);
    }

    const esPrimerUsuario = await User.countDocuments() === 0;
    const recoveryCode = crearRecoveryCode();
    const usuario = await User.create({
        nombre,
        apellido,
        email,
        legajo: String(datos.legajo || "").trim(),
        passwordHash: await crearPasswordHash(password),
        recoveryCodeHash: hashToken(recoveryCode),
        rol: esPrimerUsuario ? "admin" : "operador",
        estado: esPrimerUsuario ? "aprobado" : "pendiente",
        aprobadoEn: esPrimerUsuario ? new Date() : null
    });

    await registrarActividad({
        usuario,
        tipo: "usuario_registrado",
        detalle: esPrimerUsuario ? "Administrador inicial creado." : "Cuenta pendiente de aprobacion.",
        contexto
    });

    const resultado = {
        usuario: usuarioPublico(usuario),
        recoveryCode,
        requiereAprobacion: !esPrimerUsuario
    };

    if (esPrimerUsuario) {
        resultado.sesion = await iniciarSesionUsuario(usuario, contexto);
    }
    return resultado;
}

export async function autenticarUsuario(datos, contexto = {}) {
    const email = normalizarEmail(datos.email);
    const password = String(datos.password || "");
    const usuario = await User.findOne({ email });

    if (!usuario || !await verificarPassword(password, usuario)) {
        await registrarActividad({
            usuario,
            tipo: "login_fallido",
            detalle: `Intento para ${email}.`,
            contexto
        });
        throw crearError("Correo o contrasena incorrectos.", 401);
    }

    if (!esHashBcrypt(usuario.passwordHash)) {
        usuario.passwordHash = await crearPasswordHash(password);
        usuario.passwordSalt = "";
    }
    if (!usuario.activo) throw crearError("La cuenta esta desactivada.", 403);
    if (usuario.estado === "pendiente") {
        throw crearError("La cuenta todavia debe ser aprobada por un administrador.", 403);
    }
    if (usuario.estado === "rechazado") {
        throw crearError("La solicitud de esta cuenta fue rechazada.", 403);
    }

    usuario.ultimoAcceso = new Date();
    await usuario.save();
    const sesion = await iniciarSesionUsuario(usuario, contexto);
    await registrarActividad({ usuario, tipo: "login", detalle: "Sesion iniciada.", contexto });
    return sesion;
}

export async function buscarUsuarioPorToken(token) {
    if (!token) return null;

    const sesion = await Session.findOne({
        tokenHash: hashToken(token),
        expira: { $gt: new Date() }
    }).populate("usuario");

    if (!sesion?.usuario?.activo || sesion.usuario.estado !== "aprobado") return null;

    const ultimoUso = fechaSesion(sesion);
    if (!sesion.ultimoUso || Date.now() - ultimoUso.getTime() > 5 * 60 * 1000) {
        sesion.ultimoUso = new Date();
        sesion.save().catch(() => {});
    }

    return {
        sesion,
        usuario: usuarioPublico(sesion.usuario)
    };
}

export async function cerrarSesion(token, contexto = {}) {
    if (!token) return;
    const sesion = await Session.findOneAndDelete({ tokenHash: hashToken(token) });
    if (sesion) {
        await registrarActividad({
            usuario: sesion.usuario,
            tipo: "logout",
            detalle: "Sesion cerrada.",
            contexto
        });
    }
}

export async function listarSesiones(usuarioId, tokenActual) {
    const sesiones = await Session.find({
        usuario: usuarioId,
        expira: { $gt: new Date() }
    }).sort({ ultimoUso: -1 }).lean();
    const hashActual = hashToken(tokenActual || "");

    return sesiones.map(sesion => ({
        id: String(sesion._id),
        actual: sesion.tokenHash === hashActual,
        dispositivo: describirDispositivo(sesion.userAgent),
        ip: sesion.ip || "No disponible",
        ultimoUso: fechaSesion(sesion),
        creada: sesion.createdAt,
        expira: sesion.expira
    }));
}

export async function revocarSesion(usuarioId, sesionId) {
    const resultado = await Session.deleteOne({ _id: sesionId, usuario: usuarioId });
    if (!resultado.deletedCount) throw crearError("La sesion no existe.", 404);
}

export async function revocarOtrasSesiones(usuarioId, tokenActual) {
    return Session.deleteMany({
        usuario: usuarioId,
        tokenHash: { $ne: hashToken(tokenActual || "") }
    });
}

export async function recuperarPassword(datos, contexto = {}) {
    const email = normalizarEmail(datos.email);
    const password = validarPassword(datos.password);
    const codeHash = hashToken(String(datos.recoveryCode || "").trim().toUpperCase());
    const usuario = await User.findOne({ email, recoveryCodeHash: codeHash });

    if (!usuario) throw crearError("El correo o codigo de recuperacion no es valido.", 400);

    usuario.passwordHash = await crearPasswordHash(password);
    usuario.passwordSalt = "";
    const nuevoCodigo = crearRecoveryCode();
    usuario.recoveryCodeHash = hashToken(nuevoCodigo);
    await usuario.save();
    await Session.deleteMany({ usuario: usuario._id });
    await registrarActividad({
        usuario,
        tipo: "password_recuperada",
        detalle: "Contrasena actualizada y sesiones revocadas.",
        contexto
    });

    return { recoveryCode: nuevoCodigo };
}

export async function regenerarRecoveryCode(usuarioId, contexto = {}) {
    const recoveryCode = crearRecoveryCode();
    const usuario = await User.findByIdAndUpdate(
        usuarioId,
        { recoveryCodeHash: hashToken(recoveryCode) },
        { new: true }
    );
    if (!usuario) throw crearError("Usuario no encontrado.", 404);
    await registrarActividad({
        usuario,
        tipo: "codigo_recuperacion",
        detalle: "Codigo de recuperacion regenerado.",
        contexto
    });
    return recoveryCode;
}

async function iniciarSesionUsuario(usuario, contexto = {}) {
    const token = randomBytes(32).toString("base64url");
    const expira = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await Session.create({
        usuario: usuario._id,
        tokenHash: hashToken(token),
        expira,
        ip: contexto.ip || "",
        userAgent: contexto.userAgent || "",
        ultimoUso: new Date()
    });

    return { token, expira, usuario: usuarioPublico(usuario) };
}

async function crearPasswordHash(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verificarPassword(password, usuario) {
    if (!password) return false;
    if (esHashBcrypt(usuario.passwordHash)) {
        return bcrypt.compare(password, usuario.passwordHash);
    }
    if (!usuario.passwordSalt) return false;
    const esperado = Buffer.from(usuario.passwordHash, "hex");
    const recibido = Buffer.from(await scrypt(password, usuario.passwordSalt, 64));
    return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

function esHashBcrypt(hash = "") {
    return /^\$2[aby]\$/.test(hash);
}

function crearRecoveryCode() {
    return randomBytes(9).toString("base64url").toUpperCase();
}

function hashToken(token) {
    return createHash("sha256").update(String(token)).digest("hex");
}

function validarPassword(valor) {
    const password = String(valor || "");
    if (password.length < 8) {
        throw crearError("La contrasena debe tener al menos 8 caracteres.", 400);
    }
    return password;
}

function normalizarEmail(valor) {
    const email = String(valor || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw crearError("Ingrese un correo valido.", 400);
    }
    return email;
}

function usuarioPublico(usuario) {
    return {
        id: String(usuario._id),
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        legajo: usuario.legajo,
        rol: usuario.rol || "operador",
        permisos: permisosDelRol(usuario.rol || "operador"),
        estado: usuario.estado || "aprobado",
        activo: usuario.activo
    };
}

function describirDispositivo(userAgent = "") {
    if (!userAgent) return "Dispositivo desconocido";
    const sistema = /Android/i.test(userAgent)
        ? "Android"
        : /iPhone|iPad/i.test(userAgent)
            ? "iOS"
            : /Windows/i.test(userAgent)
                ? "Windows"
                : /Mac OS/i.test(userAgent)
                    ? "macOS"
                    : "Otro sistema";
    const navegador = /Edg/i.test(userAgent)
        ? "Edge"
        : /Chrome/i.test(userAgent)
            ? "Chrome"
            : /Firefox/i.test(userAgent)
                ? "Firefox"
                : /Safari/i.test(userAgent)
                    ? "Safari"
                    : "Navegador";
    return `${navegador} en ${sistema}`;
}

function fechaSesion(sesion) {
    const candidatas = [sesion.ultimoUso, sesion.updatedAt, sesion.createdAt, sesion.expira];
    const fechaValida = candidatas
        .map(valor => new Date(valor))
        .find(fecha => Number.isFinite(fecha.getTime()));
    return fechaValida || new Date();
}

function crearError(mensaje, status) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}
