import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcrypt";
import { User } from "../server/models/User.js";
import { Activity } from "../server/models/Activity.js";
import { actualizarPerfil } from "../server/services/authService.js";
import { requerirUsuario } from "../server/middleware/auth.js";

const datos = { nombre: "Gabriel", apellido: "Prueba", email: "gabriel@example.test", legajo: "123" };
const usuario = { _id: "507f1f77bcf86cd799439011", ...datos, activo: true, estado: "aprobado", rol: "operador", passwordHash: bcrypt.hashSync("ClavePrueba123!", 4) };

function preparar(t) {
    t.mock.method(User, "findById", async id => { assert.equal(id, usuario._id); return { ...usuario }; });
    t.mock.method(Activity, "create", async () => ({}));
    return t.mock.method(User, "findOneAndUpdate", async (filtro, cambio, opciones) => {
        assert.equal(filtro._id, usuario._id);
        assert.equal(filtro.activo, true);
        assert.equal(filtro.estado, "aprobado");
        assert.equal(opciones.runValidators, true);
        return { ...usuario, ...cambio.$set };
    });
}

test("edita los datos propios sin aceptar ID, rol, estado ni contrasenas del formulario", async t => {
    const escritura = preparar(t);
    const resultado = await actualizarPerfil(usuario._id, { ...datos, nombre: "  Nuevo nombre  ", id: "ajeno", rol: "admin", activo: false, estado: "rechazado", passwordHash: "otro" });
    assert.equal(resultado.nombre, "Nuevo nombre");
    assert.equal(resultado.id, usuario._id);
    assert.equal(resultado.rol, "operador");
    assert.equal(resultado.activo, true);
    assert.equal(resultado.passwordHash, undefined);
    assert.deepEqual(Object.keys(escritura.mock.calls[0].arguments[1].$set).sort(), ["apellido", "email", "legajo", "nombre"]);
});

test("cambiar correo requiere contrasena actual y normaliza el correo guardado", async t => {
    const escritura = preparar(t);
    for (const passwordActual of [undefined, "incorrecta"]) {
        await assert.rejects(actualizarPerfil(usuario._id, { ...datos, email: "nuevo@example.test", passwordActual }), { status: 400 });
    }
    assert.equal(escritura.mock.callCount(), 0);
    const resultado = await actualizarPerfil(usuario._id, { ...datos, email: " NUEVO@example.test ", passwordActual: "ClavePrueba123!" });
    assert.equal(resultado.email, "nuevo@example.test");
    assert.equal(escritura.mock.calls[0].arguments[0].passwordHash, usuario.passwordHash);
});

test("rechaza campos invalidos sin escribir", async t => {
    const escritura = preparar(t);
    for (const cambio of [{ nombre: " " }, { apellido: "x" }, { nombre: "a".repeat(81) }, { legajo: "a".repeat(21) }, { email: "no-es-correo" }, { nombre: {} }, { nombre: "Nombre\nNuevo" }]) {
        await assert.rejects(actualizarPerfil(usuario._id, { ...datos, ...cambio }), { status: 400 });
    }
    assert.equal(escritura.mock.callCount(), 0);
});

test("rechaza cuentas ausentes, desactivadas o no aprobadas", async t => {
    const escritura = preparar(t);
    await assert.rejects(actualizarPerfil(null, datos), { status: 401 });
    for (const cuenta of [null, { ...usuario, activo: false }, { ...usuario, estado: "pendiente" }]) {
        t.mock.method(User, "findById", async () => cuenta);
        await assert.rejects(actualizarPerfil(usuario._id, datos), { status: 403 });
    }
    assert.equal(escritura.mock.callCount(), 0);
});

test("correo duplicado, errores y cambios concurrentes no producen exito", async t => {
    preparar(t);
    t.mock.method(User, "findOneAndUpdate", async () => { throw Object.assign(new Error("Duplicado"), { code: 11000 }); });
    await assert.rejects(actualizarPerfil(usuario._id, datos), { status: 409 });
    t.mock.method(User, "findOneAndUpdate", async () => { throw new Error("Sin conexion"); });
    await assert.rejects(actualizarPerfil(usuario._id, datos), /Sin conexion/);
    t.mock.method(User, "findOneAndUpdate", async () => null);
    await assert.rejects(actualizarPerfil(usuario._id, datos), { status: 409 });
});

test("la ruta de perfil requiere una sesion", () => {
    let estado;
    requerirUsuario({}, { status(valor) { estado = valor; return { json() {} }; } }, () => assert.fail("No debe permitir el acceso."));
    assert.equal(estado, 401);
});
