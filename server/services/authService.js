import {
    createHash,
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 7;

export async function registrarUsuario(datos) {
    const nombre = String(datos.nombre || "").trim();
    const email = normalizarEmail(datos.email);
    const password = validarPassword(datos.password);

    if (nombre.length < 2) {
        throw crearError("Ingrese un nombre valido.", 400);
    }

    const existente = await User.exists({ email });
    if (existente) {
        throw crearError("Ya existe una cuenta con ese correo.", 409);
    }

    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = await crearPasswordHash(password, passwordSalt);
    const usuario = await User.create({
        nombre,
        email,
        legajo: String(datos.legajo || "").trim(),
        passwordHash,
        passwordSalt
    });

    return iniciarSesionUsuario(usuario);
}

export async function autenticarUsuario(datos) {
    const email = normalizarEmail(datos.email);
    const password = String(datos.password || "");
    const usuario = await User.findOne({ email, activo: true });

    if (!usuario || !await verificarPassword(password, usuario)) {
        throw crearError("Correo o contraseña incorrectos.", 401);
    }

    return iniciarSesionUsuario(usuario);
}

export async function buscarUsuarioPorToken(token) {
    if (!token) return null;

    const sesion = await Session.findOne({
        tokenHash: hashToken(token),
        expira: { $gt: new Date() }
    }).populate("usuario");

    if (!sesion?.usuario?.activo) return null;

    return {
        sesion,
        usuario: usuarioPublico(sesion.usuario)
    };
}

export async function cerrarSesion(token) {
    if (!token) return;
    await Session.deleteOne({ tokenHash: hashToken(token) });
}

async function iniciarSesionUsuario(usuario) {
    const token = randomBytes(32).toString("base64url");
    const expira = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await Session.create({
        usuario: usuario._id,
        tokenHash: hashToken(token),
        expira
    });

    return {
        token,
        expira,
        usuario: usuarioPublico(usuario)
    };
}

async function crearPasswordHash(password, salt) {
    const hash = await scrypt(password, salt, 64);
    return Buffer.from(hash).toString("hex");
}

async function verificarPassword(password, usuario) {
    if (!password) return false;
    const esperado = Buffer.from(usuario.passwordHash, "hex");
    const recibido = Buffer.from(await scrypt(password, usuario.passwordSalt, 64));
    return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
}

function validarPassword(valor) {
    const password = String(valor || "");
    if (password.length < 8) {
        throw crearError("La contraseña debe tener al menos 8 caracteres.", 400);
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
        email: usuario.email,
        legajo: usuario.legajo
    };
}

function crearError(mensaje, status) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}
