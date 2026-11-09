import assert from "node:assert/strict";
import { test } from "node:test";
import { obtenerProductos } from "../src/lib/excelParser.js";
import { agruparProductosPorDto, obtenerTipoUnidad } from "../src/lib/products.js";

test("admite departamentos comerciales extensos sin cambiar codigos ni ventas", () => {
    const productos = obtenerProductos([
        ["Departamento", "PLU", "Producto", "Unidades Venta", "$ Venta PVP"],
        ["71 BEBIDAS SIN ALCOHOL Y AGUAS", "101", "AGUA 1 UNI", 3, 4500],
        ["72 LIMPIEZA Y CUIDADO DEL HOGAR", "102", "JABON 1 UNI", 2, 1800]
    ]);
    assert.deepEqual(productos.map(item => [item.DTO, item.Departamento, item.PLU, item.UniKg, item.VentaTotal]), [
        ["71", "BEBIDAS SIN ALCOHOL Y AGUAS", "101", 3, 4500],
        ["72", "LIMPIEZA Y CUIDADO DEL HOGAR", "102", 2, 1800]
    ]);
    assert.equal(agruparProductosPorDto(productos)[0].departamento, "BEBIDAS SIN ALCOHOL Y AGUAS");
});

test("conserva la lectura numerica e identificadores del formato existente", () => {
    const productos = obtenerProductos([
        ["Departamento", "PLU", "Producto", "Unidades Venta", "$ Venta PVP"],
        ["25 PANADERIA", "6401", "PAN COTO 1 UNI", 5, 2500],
        ["28 PASTAS PROPIAS", "70869", "FIDEOS 1 KGM", 2.5, 6000]
    ]);
    assert.deepEqual(productos.map(item => [item.DTO, item.PLU, item.UniKg, item.VentaTotal]), [["25", "6401", 5, 2500], ["28", "70869", 2.5, 6000]]);
});

test("no introduce litros, costos ni nuevas conversiones por suposicion", () => {
    assert.equal(obtenerTipoUnidad("PRODUCTO 1 UNI"), "uni");
    assert.equal(obtenerTipoUnidad("PRODUCTO 1 KGM"), "kg");
    assert.equal(obtenerTipoUnidad("BOTELLA 1 L"), "kg");
});
