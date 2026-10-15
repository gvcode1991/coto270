import assert from "node:assert/strict";
import { test } from "node:test";
import {
    abrirBalanceGuardado,
    agregarProductosDelInventario,
    crearProductosDesdeInventario
} from "../src/lib/balanceProducts.js";
import { Balance } from "../server/models/Balance.js";
import { guardarBalance } from "../server/services/balanceService.js";

const productoHistorico = {
    PLU: "100",
    Producto: "Harina original",
    DTO: "25",
    Departamento: "Panaderia",
    UnidadMedida: "kg",
    Categoria: "materia-prima",
    CantidadContada: 12.5
};

const productoActual = {
    ...productoHistorico,
    Producto: "Producto renombrado",
    DTO: "28",
    Departamento: "Pastas propias",
    UnidadMedida: "uni",
    Categoria: "producto-final"
};

function balanceGuardado(productos = [productoHistorico]) {
    return {
        _id: "507f1f77bcf86cd799439011",
        fecha: "2026-06-25",
        tipo: "cierre",
        estado: "contado",
        productos: structuredClone(productos)
    };
}

test("abrir un balance conserva los datos historicos y no modifica el registro original", () => {
    const guardado = balanceGuardado();
    const original = structuredClone(guardado);
    const abierto = abrirBalanceGuardado(guardado);
    assert.deepEqual(abierto.productos, original.productos);
    assert.equal(abierto.fecha, original.fecha);
    assert.equal(abierto.estado, "contado");
    abierto.productos[0].CantidadContada = 15;
    assert.deepEqual(guardado, original);
});

test("agregar desde inventario conserva medida, categoria y cantidades aunque el PLU haya cambiado de datos", () => {
    const historicos = [structuredClone(productoHistorico)];
    const resultado = agregarProductosDelInventario([productoActual], historicos);
    assert.deepEqual(resultado, historicos);
    assert.notEqual(resultado[0], historicos[0]);
});

test("los productos retirados del inventario permanecen en el balance", () => {
    const retirado = { ...productoHistorico, PLU: "200", CantidadContada: 0 };
    const resultado = agregarProductosDelInventario([], [productoHistorico, retirado]);
    assert.deepEqual(resultado, [productoHistorico, retirado]);
});

test("solo incorpora productos nuevos sin conteo y no los duplica al repetir la accion", () => {
    const nuevo = { ...productoActual, PLU: "300", Producto: "Nuevo producto" };
    const inventario = [productoActual, nuevo, { ...nuevo }];
    const original = structuredClone(inventario);
    const resultado = agregarProductosDelInventario(inventario, [productoHistorico]);
    assert.equal(resultado.length, 2);
    assert.deepEqual(resultado[0], productoHistorico);
    assert.equal(resultado[1].PLU, "300");
    assert.equal(resultado[1].CantidadContada, "");
    assert.deepEqual(agregarProductosDelInventario(inventario, resultado), resultado);
    assert.deepEqual(inventario, original);
});

test("los balances nuevos usan los datos actuales sin copiar cantidades del inventario", () => {
    const productos = crearProductosDesdeInventario([productoActual]);
    assert.equal(productos[0].UnidadMedida, "uni");
    assert.equal(productos[0].Categoria, "producto-final");
    assert.equal(productos[0].CantidadContada, "");
});

test("conserva cantidades cero, decimales y pendientes al reabrir", () => {
    const guardado = balanceGuardado([0, 1.25, null].map((cantidad, indice) => ({
        ...productoHistorico,
        PLU: String(indice),
        CantidadContada: cantidad
    })));
    const abierto = abrirBalanceGuardado(guardado);
    assert.deepEqual(abierto.productos.map(item => item.CantidadContada), [0, 1.25, ""]);
});

test("guardar y reabrir mantiene el historico y permite modificar solamente el conteo", async t => {
    // Simula la persistencia para probar el servicio sin conectarse a MongoDB.
    const persistencia = t.mock.method(Balance, "findOneAndUpdate", async (filtro, actualizacion) => ({
        _id: filtro._id,
        ...structuredClone(actualizacion.$set)
    }));
    const abierto = abrirBalanceGuardado(balanceGuardado());
    abierto.productos = agregarProductosDelInventario([productoActual], abierto.productos);
    const guardado = await guardarBalance(abierto);
    assert.deepEqual(guardado.productos, [productoHistorico]);
    assert.equal(persistencia.mock.calls[0].arguments[0]._id, abierto.id);

    const reabierto = abrirBalanceGuardado(guardado);
    reabierto.productos[0].CantidadContada = 18.75;
    const modificado = await guardarBalance(reabierto);
    assert.deepEqual(modificado.productos, [{ ...productoHistorico, CantidadContada: 18.75 }]);
});
