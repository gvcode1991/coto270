import assert from "node:assert/strict";
import { test } from "node:test";
import { CatalogProduct } from "../server/models/CatalogProduct.js";
import { guardarProductoCatalogo } from "../server/services/catalogService.js";
import { guardarProductoCatalogo as enviarProducto } from "../src/lib/catalogApi.js";

const idA = "507f1f77bcf86cd799439011";
const idB = "507f1f77bcf86cd799439012";
const idNuevo = "507f1f77bcf86cd799439013";
const productoA = { _id: idA, PLU: "100", Producto: "Harina", Departamento: "Panaderia", UnidadMedida: "kg", Categoria: "materia-prima", Activo: true };
const productoB = { ...productoA, _id: idB, PLU: "200", Producto: "Pan" };

function simularInventario(t, productos = [productoA, productoB]) {
    const registros = new Map(productos.map(item => [item._id, structuredClone(item)]));
    function comprobarPLU(datos, id) {
        if ([...registros.values()].some(item => item.PLU === datos.PLU && item._id !== id)) {
            const error = new Error("Clave duplicada");
            error.code = 11000;
            throw error;
        }
    }
    const crear = t.mock.method(CatalogProduct, "create", async datos => {
        comprobarPLU(datos, idNuevo);
        const creado = { ...datos, _id: idNuevo };
        registros.set(idNuevo, creado);
        return structuredClone(creado);
    });
    const actualizar = t.mock.method(CatalogProduct, "findOneAndUpdate", async (filtro, cambios, opciones) => {
        assert.equal(opciones.upsert, false);
        assert.equal(opciones.runValidators, true);
        assert.deepEqual(Object.keys(filtro), ["_id"]);
        if (!registros.has(filtro._id)) return null;
        comprobarPLU(cambios.$set, filtro._id);
        const editado = { ...registros.get(filtro._id), ...cambios.$set };
        registros.set(filtro._id, editado);
        return structuredClone(editado);
    });
    return { registros, crear, actualizar };
}

test("alta crea un producto nuevo sin usar actualizacion por PLU", async t => {
    const { registros, actualizar } = simularInventario(t);
    const creado = await guardarProductoCatalogo({ ...productoA, id: "", PLU: " 300 " });
    assert.equal(creado.PLU, "300");
    assert.equal(creado._id, idNuevo);
    assert.equal(registros.size, 3);
    assert.equal(actualizar.mock.callCount(), 0);
});

test("alta con PLU ocupado devuelve 409 sin sobrescribir el producto", async t => {
    const { registros } = simularInventario(t);
    const original = structuredClone([...registros.values()]);
    await assert.rejects(guardarProductoCatalogo({ ...productoA, Producto: "Otro producto" }), { status: 409 });
    assert.deepEqual([...registros.values()], original);
});

test("corregir el PLU actualiza el mismo id y no deja otra fila con el PLU anterior", async t => {
    const { registros, crear } = simularInventario(t);
    const editado = await guardarProductoCatalogo({ ...productoA, id: idA, PLU: "300" });
    assert.equal(editado._id, idA);
    assert.equal(editado.PLU, "300");
    assert.equal(registros.size, 2);
    assert.equal([...registros.values()].some(item => item.PLU === "100"), false);
    assert.deepEqual(registros.get(idB), productoB);
    assert.equal(crear.mock.callCount(), 0);
});

test("editar otros datos conserva el identificador y el PLU", async t => {
    simularInventario(t);
    const editado = await guardarProductoCatalogo({ ...productoA, id: idA, Producto: "Harina integral" });
    assert.equal(editado._id, idA);
    assert.equal(editado.PLU, "100");
    assert.equal(editado.Producto, "Harina integral");
});

test("cambiar al PLU de otro producto rechaza la edicion y conserva ambos", async t => {
    const { registros } = simularInventario(t);
    const original = structuredClone([...registros.values()]);
    await assert.rejects(guardarProductoCatalogo({ ...productoA, id: idA, PLU: "200" }), { status: 409 });
    assert.deepEqual([...registros.values()], original);
});

test("un producto eliminado no se recrea al enviar una edicion pendiente", async t => {
    const { registros, crear } = simularInventario(t, [productoB]);
    await assert.rejects(guardarProductoCatalogo({ ...productoA, id: idA }), { status: 404 });
    assert.equal(registros.size, 1);
    assert.equal(crear.mock.callCount(), 0);
});

test("un id invalido no dispara escrituras", async t => {
    const { crear, actualizar } = simularInventario(t);
    await assert.rejects(guardarProductoCatalogo({ ...productoA, id: "invalido" }), { status: 400 });
    assert.equal(crear.mock.callCount(), 0);
    assert.equal(actualizar.mock.callCount(), 0);
});

test("el cliente envia el id original separado del nuevo PLU y conserva el error de conflicto", async t => {
    const datos = { ...productoA, id: idA, PLU: "200" };
    t.mock.method(globalThis, "fetch", async (url, opciones) => {
        assert.equal(url, "/api/catalog");
        assert.equal(opciones.method, "POST");
        assert.equal(opciones.credentials, "include");
        assert.deepEqual(JSON.parse(opciones.body), datos);
        return new Response(JSON.stringify({ mensaje: "PLU ocupado" }), { status: 409 });
    });
    await assert.rejects(enviarProducto(datos), { message: "PLU ocupado" });
});
