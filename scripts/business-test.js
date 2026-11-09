import assert from "node:assert/strict";
import { test } from "node:test";
import { Business } from "../server/models/Business.js";
import { obtenerNegocio, guardarNegocio } from "../server/services/businessService.js";
import { NEGOCIO_PREDETERMINADO, RUBROS, validarNegocio } from "../src/lib/business.js";

const admin = { rol: "admin" };

test("una instalacion existente sin negocio devuelve valores compatibles sin escribir", async t => {
    t.mock.method(Business, "findById", id => { assert.equal(id, "principal"); return { lean: async () => null }; });
    const escritura = t.mock.method(Business, "findOneAndUpdate", () => assert.fail("La lectura no debe crear datos."));
    assert.deepEqual(await obtenerNegocio(), NEGOCIO_PREDETERMINADO);
    assert.equal(escritura.mock.callCount(), 0);
});

test("guarda y recupera nombre y rubro en la unica configuracion de la instalacion", async t => {
    let documento = null;
    t.mock.method(Business, "findOneAndUpdate", async (filtro, cambios, opciones) => {
        assert.deepEqual(filtro, { _id: "principal" });
        assert.equal(opciones.runValidators, true);
        assert.equal(opciones.upsert, true);
        documento = { _id: "principal", ...cambios.$set };
        return documento;
    });
    t.mock.method(Business, "findById", () => ({ lean: async () => documento }));
    const guardado = await guardarNegocio({ nombre: "  Almacén del barrio  ", rubro: "almacen", productos: ["no guardar"] }, admin);
    assert.deepEqual(guardado, { nombre: "Almacén del barrio", rubro: "almacen", configurado: true });
    assert.deepEqual(await obtenerNegocio(), guardado);
    assert.deepEqual(Object.keys(documento).sort(), ["_id", "nombre", "rubro"]);
});

test("cambiar el rubro solo escribe nombre y rubro, sin reclasificar datos", async t => {
    const escritura = t.mock.method(Business, "findOneAndUpdate", async (filtro, cambios) => cambios.$set);
    for (const rubro of Object.keys(RUBROS)) {
        await guardarNegocio({ nombre: "Comercio", rubro }, admin);
    }
    for (const llamada of escritura.mock.calls) assert.deepEqual(Object.keys(llamada.arguments[1].$set).sort(), ["nombre", "rubro"]);
});

test("rechaza campos invalidos antes de intentar escribir", async t => {
    const escritura = t.mock.method(Business, "findOneAndUpdate", () => assert.fail("No debe escribir datos invalidos."));
    for (const datos of [null, {}, { nombre: " ", rubro: "otro" }, { nombre: "a".repeat(101), rubro: "otro" }, { nombre: "Kiosco\nPrueba", rubro: "kiosco" }, { nombre: 123, rubro: "kiosco" }, { nombre: "Comercio", rubro: "__proto__" }, { nombre: "Comercio", rubro: "desconocido" }]) {
        await assert.rejects(guardarNegocio(datos, admin), { status: 400 });
    }
    assert.equal(escritura.mock.callCount(), 0);
});

test("solo el administrador puede guardar la configuracion", async t => {
    const escritura = t.mock.method(Business, "findOneAndUpdate", () => assert.fail("Escritura sin permiso."));
    for (const usuario of [null, { rol: "gerente" }, { rol: "referente" }, { rol: "operador" }]) {
        await assert.rejects(guardarNegocio({ nombre: "Comercio", rubro: "kiosco" }, usuario), { status: 403 });
    }
    assert.equal(escritura.mock.callCount(), 0);
});

test("un fallo de MongoDB se propaga y no produce un falso guardado", async t => {
    t.mock.method(Business, "findOneAndUpdate", async () => { throw new Error("Base no disponible"); });
    await assert.rejects(guardarNegocio({ nombre: "Comercio", rubro: "otro" }, admin), /Base no disponible/);
});

test("valida tildes y nombres reales sin convertir el rubro en una regla comercial", () => {
    assert.deepEqual(validarNegocio({ nombre: "Kiosco Ñandú", rubro: "kiosco" }), { nombre: "Kiosco Ñandú", rubro: "kiosco" });
});
