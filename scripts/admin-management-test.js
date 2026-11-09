import assert from "node:assert/strict";
import { test } from "node:test";
import { User } from "../server/models/User.js";
import { Session } from "../server/models/Session.js";
import { Activity } from "../server/models/Activity.js";
import { eliminarUsuario } from "../server/services/adminService.js";
import { limpiarActividadGlobal, listarActividadGlobal } from "../server/services/activityService.js";
import { requerirAdmin } from "../server/middleware/auth.js";

const administrador = { id: "507f1f77bcf86cd799439011", rol: "admin", email: "admin@example.test" };
const usuarioId = "507f1f77bcf86cd799439012";
const usuario = { _id: usuarioId, rol: "operador", email: "usuario@example.test" };

function simularEliminacion(t, objetivo = usuario) {
    const buscar = t.mock.method(User, "findById", async () => objetivo);
    const borrar = t.mock.method(User, "findOneAndDelete", async filtro => {
        assert.deepEqual(filtro, { _id: usuarioId, rol: { $ne: "admin" } });
        return objetivo;
    });
    const sesiones = t.mock.method(Session, "deleteMany", async () => ({ deletedCount: 2 }));
    const actividad = t.mock.method(Activity, "create", async datos => datos);
    return { buscar, borrar, sesiones, actividad };
}

test("elimina cuentas no admin, revoca sus sesiones y registra al administrador responsable", async t => {
    const { sesiones, actividad } = simularEliminacion(t);
    const resultado = await eliminarUsuario({ usuarioId, administrador, contexto: { ip: "127.0.0.1" } });
    assert.equal(resultado._id, usuarioId);
    assert.deepEqual(sesiones.mock.calls[0].arguments[0], { usuario: usuarioId });
    assert.equal(actividad.mock.calls[0].arguments[0].usuario, administrador.id);
    assert.equal(actividad.mock.calls[0].arguments[0].tipo, "usuario_eliminado");
});

test("protege cualquier cuenta admin aunque se intente eliminar directamente por API", async t => {
    const { borrar, sesiones } = simularEliminacion(t, { ...usuario, rol: "admin" });
    await assert.rejects(eliminarUsuario({ usuarioId, administrador }), { status: 403 });
    assert.equal(borrar.mock.callCount(), 0);
    assert.equal(sesiones.mock.callCount(), 0);
});

test("protege la cuenta propia y rechaza actores no admin e identificadores invalidos", async t => {
    const { buscar, borrar } = simularEliminacion(t);
    await assert.rejects(eliminarUsuario({ usuarioId: administrador.id, administrador }), { status: 403 });
    for (const rol of ["gerente", "referente", "operador"]) {
        await assert.rejects(eliminarUsuario({ usuarioId, administrador: { ...administrador, rol } }), { status: 403 });
    }
    await assert.rejects(eliminarUsuario({ usuarioId: "invalido", administrador }), { status: 400 });
    assert.equal(buscar.mock.callCount(), 0);
    assert.equal(borrar.mock.callCount(), 0);
});

test("una cuenta inexistente devuelve 404 sin eliminar sesiones", async t => {
    const { borrar, sesiones } = simularEliminacion(t, null);
    await assert.rejects(eliminarUsuario({ usuarioId, administrador }), { status: 404 });
    assert.equal(borrar.mock.callCount(), 0);
    assert.equal(sesiones.mock.callCount(), 0);
});

test("no borra una cuenta promovida a admin durante la solicitud", async t => {
    const { sesiones } = simularEliminacion(t);
    t.mock.method(User, "findOneAndDelete", async filtro => {
        assert.deepEqual(filtro.rol, { $ne: "admin" });
        return null;
    });
    await assert.rejects(eliminarUsuario({ usuarioId, administrador }), { status: 409 });
    assert.equal(sesiones.mock.callCount(), 0);
});

test("la actividad global recupera registros mas alla de los primeros 100", async t => {
    const filas = Array.from({ length: 125 }, (_, i) => ({ _id: String(i), tipo: "login" }));
    t.mock.method(Activity, "countDocuments", async () => filas.length);
    t.mock.method(Activity, "find", () => {
        let inicio = 0, limite = 10;
        const consulta = {
            sort(orden) { assert.deepEqual(orden, { createdAt: -1, _id: -1 }); return consulta; },
            skip(valor) { inicio = valor; return consulta; },
            limit(valor) { limite = valor; return consulta; },
            populate(configuracion) { assert.deepEqual(configuracion, { path: "usuario", select: "nombre email" }); return consulta; },
            then(resolve, reject) { return Promise.resolve(filas.slice(inicio, inicio + limite)).then(resolve, reject); }
        };
        return consulta;
    });
    const resultado = await listarActividadGlobal({ pagina: 13, limite: 10 });
    assert.equal(resultado.actividad[0]._id, "120");
    assert.equal(resultado.actividad.length, 5);
    assert.deepEqual(resultado.paginacion, { pagina: 13, limite: 10, total: 125, totalPaginas: 13 });
});

test("limpiar actividad elimina exclusivamente registros de actividad", async t => {
    const borrarActividad = t.mock.method(Activity, "deleteMany", async filtro => {
        assert.deepEqual(filtro, {});
        return { deletedCount: 125 };
    });
    const borrarUsuarios = t.mock.method(User, "deleteMany", async () => assert.fail("No debe borrar usuarios."));
    const borrarSesiones = t.mock.method(Session, "deleteMany", async () => assert.fail("No debe borrar sesiones."));
    assert.deepEqual(await limpiarActividadGlobal(administrador), { eliminados: 125 });
    assert.equal(borrarActividad.mock.callCount(), 1);
    assert.equal(borrarUsuarios.mock.callCount(), 0);
    assert.equal(borrarSesiones.mock.callCount(), 0);
});

test("gerentes y otros roles no pueden limpiar registros", async t => {
    const borrar = t.mock.method(Activity, "deleteMany", async () => assert.fail("Accion no autorizada."));
    for (const rol of ["gerente", "referente", "operador"]) {
        await assert.rejects(limpiarActividadGlobal({ rol }), { status: 403 });
    }
    assert.equal(borrar.mock.callCount(), 0);
});

test("el middleware de las nuevas rutas exige admin antes de ejecutar la accion", () => {
    for (const rol of ["gerente", "referente", "operador"]) {
        let estado;
        requerirAdmin({ usuario: { rol } }, { status: valor => { estado = valor; return { json() {} }; } }, () => assert.fail("No debe permitir la accion."));
        assert.equal(estado, 403);
    }
    let permitido = false;
    requerirAdmin({ usuario: administrador }, {}, () => { permitido = true; });
    assert.equal(permitido, true);
});
