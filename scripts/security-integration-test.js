import "dotenv/config";
import { scryptSync } from "node:crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { actualizarEstadoUsuario } from "../server/services/adminService.js";
import { tienePermiso } from "../server/config/permissions.js";
import {
    autenticarUsuario,
    listarSesiones,
    recuperarPassword,
    registrarUsuario,
    revocarOtrasSesiones
} from "../server/services/authService.js";
import { Activity } from "../server/models/Activity.js";
import { Session } from "../server/models/Session.js";
import { User } from "../server/models/User.js";
import { migrarSeguridadUsuarios } from "../server/services/securityMigration.js";

if (!process.env.MONGODB_URI) {
    console.log("Prueba de seguridad omitida: MONGODB_URI no configurado.");
    process.exit(0);
}

const databaseName = `pulso-security-test-${Date.now()}`;
const contexto = { ip: "127.0.0.1", userAgent: "Pulso Security Test" };

try {
    await mongoose.connect(process.env.MONGODB_URI, {
        dbName: databaseName,
        serverSelectionTimeoutMS: 10000
    });

    const admin = await registrarUsuario({
        nombre: "Administrador",
        apellido: "Prueba",
        email: "admin@pulso.test",
        legajo: "1",
        password: "Segura123!"
    }, contexto);
    verificar(admin.usuario.rol === "admin", "El primer usuario no fue administrador.");
    verificar(admin.usuario.estado === "aprobado", "El administrador no fue aprobado.");
    verificar(Boolean(admin.recoveryCode), "No se genero codigo de recuperacion.");
    const adminGuardado = await User.findOne({ email: "admin@pulso.test" });
    verificar(await bcrypt.compare("Segura123!", adminGuardado.passwordHash), "La contrasena no usa bcrypt.");

    const pendiente = await registrarUsuario({
        nombre: "Usuario",
        apellido: "Prueba",
        email: "usuario@pulso.test",
        legajo: "2",
        password: "Segura123!"
    }, contexto);
    verificar(pendiente.requiereAprobacion, "El segundo usuario no quedo pendiente.");

    await esperarError(
        () => autenticarUsuario({
            email: "usuario@pulso.test",
            password: "Segura123!"
        }, contexto),
        403
    );

    const usuarioPendiente = await User.findOne({ email: "usuario@pulso.test" });
    await actualizarEstadoUsuario({
        usuarioId: usuarioPendiente._id,
        estado: "aprobado",
        administrador: admin.usuario,
        contexto
    });

    const sesion = await autenticarUsuario({
        email: "usuario@pulso.test",
        password: "Segura123!"
    }, contexto);
    const sesiones = await listarSesiones(sesion.usuario.id, sesion.token);
    verificar(sesiones.length === 1 && sesiones[0].actual, "La sesion no fue registrada.");

    await Session.collection.updateOne(
        { usuario: usuarioPendiente._id },
        { $unset: { ultimoUso: "" } }
    );
    const sesionesHeredadas = await listarSesiones(sesion.usuario.id, sesion.token);
    verificar(
        Number.isFinite(new Date(sesionesHeredadas[0].ultimoUso).getTime()),
        "Una sesion heredada sin ultimoUso no obtuvo una fecha valida."
    );

    await revocarOtrasSesiones(sesion.usuario.id, sesion.token);
    const recuperacion = await recuperarPassword({
        email: "usuario@pulso.test",
        recoveryCode: pendiente.recoveryCode,
        password: "NuevaSegura123!"
    }, contexto);
    verificar(Boolean(recuperacion.recoveryCode), "No se renovo el codigo de recuperacion.");

    await autenticarUsuario({
        email: "usuario@pulso.test",
        password: "NuevaSegura123!"
    }, contexto);
    verificar(await Activity.countDocuments() >= 5, "No se registro el historial esperado.");

    await Promise.all([
        Activity.deleteMany({}),
        Session.deleteMany({}),
        User.deleteMany({})
    ]);
    await User.collection.insertOne({
        nombre: "Usuario",
        apellido: "Existente",
        email: "existente@pulso.test",
        legajo: "198551",
        passwordHash: scryptSync("Legacy123!", "salt", 64).toString("hex"),
        passwordSalt: "salt",
        role: "admin",
        activo: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01")
    });
    await migrarSeguridadUsuarios();
    let migrado = await User.findOne({ email: "existente@pulso.test" });
    verificar(migrado.rol === "admin", "El usuario existente no fue promovido a administrador.");
    verificar(migrado.estado === "aprobado", "El usuario existente no conservo el acceso.");
    await autenticarUsuario({
        email: "existente@pulso.test",
        password: "Legacy123!"
    }, contexto);
    migrado = await User.findOne({ email: "existente@pulso.test" });
    verificar(await bcrypt.compare("Legacy123!", migrado.passwordHash), "El hash anterior no migro a bcrypt.");

    verificar(tienePermiso({ rol: "admin" }, "balances:gestionar"), "Admin debe tener acceso total.");
    verificar(tienePermiso({ rol: "gerente" }, "usuarios:ver"), "Gerente debe ver usuarios.");
    verificar(tienePermiso({ rol: "referente" }, "balances:gestionar"), "Referente debe gestionar balances.");
    verificar(tienePermiso({ rol: "operador" }, "reportes:cargar"), "Operador debe cargar reportes.");
    verificar(!tienePermiso({ rol: "operador" }, "usuarios:ver"), "Operador no debe ver usuarios.");

    console.log("Bcrypt, roles, aprobacion, sesiones, recuperacion y migracion verificados.");
} finally {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
}

function verificar(condicion, mensaje) {
    if (!condicion) throw new Error(mensaje);
}

async function esperarError(accion, status) {
    try {
        await accion();
    } catch (error) {
        verificar(error.status === status, `Se esperaba estado ${status}.`);
        return;
    }
    throw new Error("La operacion debia fallar.");
}
