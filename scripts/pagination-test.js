import assert from "node:assert/strict";
import { test } from "node:test";
import { paginar } from "../server/lib/pagination.js";
import { CatalogProduct } from "../server/models/CatalogProduct.js";
import { Balance } from "../server/models/Balance.js";
import { Report } from "../server/models/Report.js";
import { listarCatalogo } from "../server/services/catalogService.js";
import { listarBalances } from "../server/services/balanceService.js";
import { listarReportes } from "../server/services/reportService.js";
import { listarInventarioCompleto } from "../src/lib/catalogApi.js";

function simular(t, modelo, cantidad) {
    const filas = Array.from({ length: cantidad }, (_, i) => ({ _id: String(i), PLU: String(i), Producto: `Producto ${i}` }));
    t.mock.method(modelo, "countDocuments", async () => filas.length);
    t.mock.method(modelo, "find", () => {
        let inicio = 0, limite = filas.length;
        const consulta = {
            sort() { return consulta; },
            skip(valor) { inicio = valor; return consulta; },
            limit(valor) { limite = valor; return consulta; },
            select() { return consulta; },
            then(resolve, reject) { return Promise.resolve(filas.slice(inicio, inicio + limite)).then(resolve, reject); }
        };
        return consulta;
    });
}

test("inventario permite consultar productos mas alla del antiguo limite de 800", async t => {
    simular(t, CatalogProduct, 805);
    const resultado = await listarCatalogo({ pagina: "81", limite: "10" });
    assert.equal(resultado.productos[0].PLU, "800");
    assert.equal(resultado.productos.length, 5);
    assert.equal(resultado.paginacion.total, 805);
});

test("historial de balances y reportes recupera registros fuera de los limites anteriores", async t => {
    simular(t, Balance, 45);
    simular(t, Report, 105);
    const balances = await listarBalances({ pagina: 5 });
    const reportes = await listarReportes({ pagina: 11 });
    assert.equal(balances.balances[0]._id, "40");
    assert.equal(reportes.reportes[0]._id, "100");
});

test("al borrar la ultima pagina se ajusta a la ultima pagina existente", async t => {
    simular(t, Balance, 10);
    const resultado = await listarBalances({ pagina: 2 });
    assert.equal(resultado.paginacion.pagina, 1);
    assert.equal(resultado.balances.length, 10);
});

test("la paginacion valida parametros, limita tamano y admite listas vacias", async t => {
    simular(t, Balance, 0);
    const resultado = await paginar(Balance, {}, { limite: 1000 });
    assert.deepEqual(resultado.paginacion, { pagina: 1, limite: 100, total: 0, totalPaginas: 1 });
    for (const pagina of [0, -1, "abc", "1.5", [1], "999999999999999999999"]) {
        await assert.rejects(listarBalances({ pagina }), { status: 400 });
    }
});

test("Balance recorre todas las paginas del inventario sin perder productos", async t => {
    simular(t, CatalogProduct, 805);
    t.mock.method(globalThis, "fetch", async url => {
        const filtros = Object.fromEntries(new URL(url, "http://prueba.local").searchParams);
        return new Response(JSON.stringify(await listarCatalogo(filtros)));
    });
    const productos = await listarInventarioCompleto();
    assert.equal(productos.length, 805);
    assert.equal(new Set(productos.map(item => item.PLU)).size, 805);
    assert.equal(productos.at(-1).PLU, "804");
});
