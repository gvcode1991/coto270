import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizarCantidadContada } from "../src/lib/balanceQuantities.js";
import { Balance } from "../server/models/Balance.js";
import { guardarBalance } from "../server/services/balanceService.js";

test("kg acepta coma, punto y valores numericos sin truncar los decimales", () => {
    for (const [entrada, cantidad] of [["1,5", 1.5], ["1.5", 1.5], [" 0,125 ", 0.125], [",5", 0.5], [".5", 0.5], [12.75, 12.75], ["1234,56", 1234.56]]) {
        assert.equal(normalizarCantidadContada(entrada, "kg"), cantidad);
    }
});

test("los campos pendientes se distinguen de un conteo de cero", () => {
    for (const unidad of ["kg", "uni"]) {
        for (const pendiente of [null, undefined, "", "  "]) {
            assert.equal(normalizarCantidadContada(pendiente, unidad), null);
        }
        for (const cero of [0, "0", "0,00", "0.00"]) {
            assert.equal(normalizarCantidadContada(cero, unidad), 0);
        }
    }
});

test("unidad acepta enteros y rechaza fracciones incluso si Number las redondearia", () => {
    for (const entrada of [1, "12", "12,00", "12.00"]) {
        assert.equal(normalizarCantidadContada(entrada, "uni"), Number(String(entrada).replace(",", ".")));
    }
    for (const entrada of [1.5, "1,5", "0.01", "1.00000000000000001"]) {
        assert.throws(() => normalizarCantidadContada(entrada, "uni"), { status: 400 });
    }
});

test("rechaza negativos, texto, valores no finitos y formatos ambiguos", () => {
    const invalidos = [-1, "-0,5", "abc", NaN, Infinity, -Infinity, "Infinity", true, false, {}, [], "1.234,56", "1,234.56", "1 000", "1e3", "0x10", "1..5", ".", ",", "1,", "1.", Number.MAX_SAFE_INTEGER + 1];
    for (const unidad of ["kg", "uni"]) {
        for (const entrada of invalidos) {
            assert.throws(() => normalizarCantidadContada(entrada, unidad), { status: 400 });
        }
    }
});

function producto(PLU, unidad, cantidad) {
    return { PLU, Producto: `Producto ${PLU}`, Departamento: "Panaderia", UnidadMedida: unidad, CantidadContada: cantidad };
}

function balance(productos) {
    return { fecha: "2026-10-14", tipo: "cierre", productos };
}

test("el servicio convierte coma decimal y conserva cero y pendientes antes de persistir", async t => {
    const persistencia = t.mock.method(Balance, "findOneAndUpdate", async (filtro, cambios) => cambios.$set);
    const resultado = await guardarBalance(balance([
        producto("1", "kg", "1,25"),
        producto("2", "uni", "2"),
        producto("3", "uni", 0),
        producto("4", "kg", "")
    ]));
    assert.deepEqual(resultado.productos.map(item => item.CantidadContada), [1.25, 2, 0, null]);
    assert.equal(persistencia.mock.callCount(), 1);
});

test("una cantidad invalida rechaza todo el guardado, identifica el producto y no escribe datos", async t => {
    const persistencia = t.mock.method(Balance, "findOneAndUpdate", async () => {
        assert.fail("No se debe escribir un balance invalido.");
    });
    for (const [unidad, cantidad] of [["kg", "abc"], ["kg", -1], ["uni", "1,5"]]) {
        await assert.rejects(
            guardarBalance(balance([producto("1", "kg", "2,5"), producto("99", unidad, cantidad)])),
            error => error.status === 400 && error.message.includes("PLU 99") && error.message.includes("Producto 99")
        );
    }
    assert.equal(persistencia.mock.callCount(), 0);
});
