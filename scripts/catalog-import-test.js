import assert from "node:assert/strict";
import { test } from "node:test";
import { CatalogProduct } from "../server/models/CatalogProduct.js";
import { importarProductosCatalogo } from "../server/services/catalogService.js";
import { importarCatalogo } from "../server/controllers/catalogController.js";

const existente = {
    PLU: "100",
    Producto: "Harina seleccionada manualmente",
    DTO: "25",
    Departamento: "Panaderia",
    UnidadMedida: "kg",
    Categoria: "materia-prima",
    Activo: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-02-01")
};
const filaReporte = {
    ...existente,
    Producto: "Nombre del 270",
    DTO: "28",
    Departamento: "Pastas",
    UnidadMedida: "uni",
    Categoria: "producto-final",
    Activo: true
};

function simularColeccion(t, productos = [existente]) {
    const registros = new Map(productos.map(item => [item.PLU, structuredClone(item)]));
    // Conserva el procesamiento real de Mongoose y simula solo la escritura del driver.
    const escritura = t.mock.method(CatalogProduct.collection, "bulkWrite", async operaciones => {
        let upsertedCount = 0;
        for (const { updateOne } of operaciones) {
            assert.equal(updateOne.upsert, true);
            assert.deepEqual(Object.keys(updateOne.update), ["$setOnInsert"]);
            const plu = updateOne.filter.PLU;
            if (registros.has(plu)) continue;
            registros.set(plu, structuredClone(updateOne.update.$setOnInsert));
            upsertedCount += 1;
        }
        return { upsertedCount, modifiedCount: 0 };
    });
    return { registros, escritura };
}

test("importar un PLU existente conserva sus clasificaciones, estado y fechas", async t => {
    const { registros } = simularColeccion(t);
    const resultado = await importarProductosCatalogo([filaReporte]);
    assert.deepEqual(registros.get("100"), existente);
    assert.equal(resultado.creados, 0);
    assert.equal(resultado.conservados, 1);
    assert.equal(resultado.actualizados, 0);
});

test("una importacion mixta incorpora los nuevos sin tocar los existentes", async t => {
    const { registros } = simularColeccion(t);
    const nuevo = { ...filaReporte, PLU: "200" };
    const resultado = await importarProductosCatalogo([filaReporte, nuevo]);
    assert.equal(resultado.creados, 1);
    assert.equal(resultado.conservados, 1);
    assert.deepEqual(registros.get("100"), existente);
    assert.equal(registros.get("200").UnidadMedida, "uni");
    assert.equal(registros.get("200").Categoria, "producto-final");
    assert.equal(registros.get("200").Activo, true);
    assert.ok(registros.get("200").createdAt instanceof Date);
    assert.ok(registros.get("200").updatedAt instanceof Date);
    assert.notEqual(registros.get("200").createdAt.getTime(), existente.createdAt.getTime());
});

test("reimportar el reporte no cambia datos ni fechas y no crea duplicados", async t => {
    const { registros } = simularColeccion(t, []);
    const primero = await importarProductosCatalogo([filaReporte]);
    const guardado = structuredClone([...registros.values()]);
    const segundo = await importarProductosCatalogo([{ ...filaReporte, UnidadMedida: "kg" }]);
    assert.equal(primero.creados, 1);
    assert.equal(segundo.creados, 0);
    assert.equal(segundo.conservados, 1);
    assert.deepEqual([...registros.values()], guardado);
});

test("las filas repetidas se agrupan por PLU antes de escribir", async t => {
    const { registros, escritura } = simularColeccion(t, []);
    const resultado = await importarProductosCatalogo([filaReporte, { ...filaReporte, PLU: " 100 " }]);
    assert.equal(registros.size, 1);
    assert.equal(escritura.mock.calls[0].arguments[0].length, 1);
    assert.deepEqual(resultado, { recibidos: 2, unicos: 1, duplicados: 1, creados: 1, conservados: 0, actualizados: 0 });
});

test("listas invalidas o incompletas no provocan escrituras", async t => {
    const { escritura } = simularColeccion(t);
    for (const productos of [null, {}, "productos", [], [filaReporte, { PLU: "200" }]]) {
        await assert.rejects(importarProductosCatalogo(productos), { status: 400 });
    }
    assert.equal(escritura.mock.callCount(), 0);
});

test("el mensaje diferencia productos creados, conservados y filas repetidas", async t => {
    simularColeccion(t);
    let respuesta;
    await importarCatalogo(
        { body: { productos: [filaReporte, filaReporte, { ...filaReporte, PLU: "200" }] } },
        { json: datos => { respuesta = datos; } },
        error => { throw error; }
    );
    assert.equal(respuesta.resultado.creados, 1);
    assert.equal(respuesta.resultado.conservados, 1);
    assert.match(respuesta.mensaje, /1 productos nuevos/);
    assert.match(respuesta.mensaje, /1 existentes conservados/);
    assert.match(respuesta.mensaje, /1 filas repetidas/);
});
