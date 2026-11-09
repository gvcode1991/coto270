import assert from "node:assert/strict";
import { test } from "node:test";
import { Report } from "../server/models/Report.js";
import { calcularComparacion, compararReportesGuardados } from "../server/services/reportComparisonService.js";
import { reportRoutes } from "../server/routes/reportRoutes.js";

const ID_BASE = "507f1f77bcf86cd799439011", ID_ACTUAL = "507f1f77bcf86cd799439012";
function semana(inicio = "2026-11-02", filas = [], dias = 7) {
    const fechas = Array.from({ length: dias }, (_, i) => new Date(Date.parse(`${inicio}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10));
    return { _id: inicio === "2026-11-02" ? ID_BASE : ID_ACTUAL, nombreArchivo: `Ventas ${inicio}.ods`, periodo: { inicio, fin: fechas.at(-1), fechas },
        productos: filas.map(fila => ({ PLU: "001", Producto: "PAN 1 UNI", DTO: "25", Departamento: "PANADERIA", UnidadMedida: "uni", UniKg: 10, VentaTotal: 100, ...fila,
            VentasPorFecha: Object.fromEntries(fechas.map(fecha => [fecha, { fecha, etiqueta: fecha, UniKg: (fila.UniKg ?? 10) / dias, VentaTotal: (fila.VentaTotal ?? 100) / dias }])) })) };
}
function par() {
    return [semana(undefined, [{}, { PLU: "002", Producto: "PASTAS 1 KGM", UnidadMedida: "kg", DTO: "28", Departamento: "PASTAS", UniKg: 2.5, VentaTotal: 200 }]),
        semana("2026-11-09", [{ UniKg: 15, VentaTotal: 130 }, { PLU: "002", Producto: "PASTAS 1 KGM", UnidadMedida: "kg", DTO: "28", Departamento: "PASTAS", UniKg: 2, VentaTotal: 200 }])];
}

test("compara unidades, kg y pesos por separado y calcula el porcentaje desde la base", () => {
    const resultado = calcularComparacion(...par());
    assert.equal(resultado.advertencias.length, 0);
    assert.deepEqual(resultado.general.unidades, { base: 10, comparado: 15, diferencia: 5, porcentaje: 50, estado: "comparable" });
    assert.equal(resultado.general.kilogramos.diferencia, -0.5);
    assert.equal(resultado.general.kilogramos.porcentaje, -20);
    assert.equal(resultado.general.venta.diferencia, 30);
    assert.equal(resultado.general.venta.porcentaje, 10);
    for (const campo of ["unidades", "kilogramos", "venta"]) {
        for (const lado of ["base", "comparado"]) {
            assert.equal(resultado.departamentos.reduce((total, d) => total + d[campo][lado], 0), resultado.general[campo][lado]);
            assert.equal(resultado.productos.reduce((total, p) => total + p[campo][lado], 0), resultado.general[campo][lado]);
        }
    }
});

test("vincula por PLU y codigo aunque cambien nombres y suma lineas repetidas sin perder importes", () => {
    const base = semana(undefined, [{ UniKg: 3, VentaTotal: 30 }, { UniKg: 7, VentaTotal: 70 }]);
    const actual = semana("2026-11-09", [{ Producto: "PAN NUEVO NOMBRE", Departamento: "PANADERIA NUEVA", UniKg: 12, VentaTotal: 150 }]);
    const copia = structuredClone([base, actual]);
    const resultado = calcularComparacion(base, actual);
    assert.equal(resultado.productos.length, 1);
    assert.equal(resultado.departamentos.length, 1);
    assert.equal(resultado.productos[0].nombre, "PAN NUEVO NOMBRE");
    assert.equal(resultado.productos[0].unidades.base, 10);
    assert.equal(resultado.productos[0].venta.diferencia, 50);
    assert.deepEqual([base, actual], copia);
});

test("distingue productos ausentes y exclusivos sin inventar porcentajes desde cero", () => {
    const base = semana(undefined, [{}, { PLU: "003", UniKg: 0, VentaTotal: 0 }]);
    const actual = semana("2026-11-09", [{ PLU: "002", UniKg: 5, VentaTotal: 50 }]);
    const resultado = calcularComparacion(base, actual);
    const ausente = resultado.productos.find(p => p.plu === "001"), nuevo = resultado.productos.find(p => p.plu === "002");
    assert.equal(ausente.estado, "solo-base"); assert.equal(ausente.unidades.porcentaje, -100);
    assert.equal(nuevo.estado, "solo-comparado"); assert.equal(nuevo.venta.base, 0); assert.equal(nuevo.venta.porcentaje, null);
    assert.equal(resultado.productos.find(p => p.plu === "003").venta.porcentaje, null);
    assert.notEqual(nuevo.plu, "2");
});

test("bloquea variaciones de cantidades cuando cambia la medida, sin bloquear el dinero", () => {
    const [base, actual] = par(); actual.productos[0].UnidadMedida = "kg";
    const resultado = calcularComparacion(base, actual);
    assert.equal(resultado.productos.find(p => p.plu === "001").unidades.diferencia, null);
    assert.equal(resultado.general.kilogramos.estado, "medida-incompatible");
    assert.equal(resultado.departamentos.find(d => d.codigo === "25").unidades.porcentaje, null);
    assert.equal(resultado.departamentos.find(d => d.codigo === "28").kilogramos.diferencia, -0.5);
    assert.equal(resultado.general.venta.diferencia, 30);
    assert.ok(resultado.advertencias.some(a => a.includes("medidas distintas")));
});

test("advierte si un mismo PLU contiene dos medidas y si cambia de departamento", () => {
    const base = semana(undefined, [{}, { UnidadMedida: "kg", UniKg: 1 }]);
    const actual = semana("2026-11-09", [{ DTO: "28", Departamento: "PASTAS" }]);
    const resultado = calcularComparacion(base, actual);
    assert.equal(resultado.productos[0].unidades.diferencia, null);
    assert.ok(resultado.advertencias.some(a => a.includes("cambiaron de departamento")));
    assert.equal(resultado.departamentos.length, 2);
});

test("los periodos parciales o de distinta duracion no se extrapolan", () => {
    const resultado = calcularComparacion(semana(undefined, [{ UniKg: 14 }], 2), semana("2026-11-09", [{ UniKg: 7 }], 3));
    assert.equal(resultado.general.unidades.diferencia, -7);
    assert.ok(resultado.advertencias.some(a => a.includes("distinta duración")));
    assert.ok(resultado.advertencias.some(a => a.includes("semana completa")));
});

test("advierte periodos superpuestos o invertidos sin cambiar la direccion de calculo", () => {
    const [base, actual] = par();
    const superpuesto = calcularComparacion(base, semana("2026-11-05", [{}]));
    assert.ok(superpuesto.advertencias.some(a => a.includes("superponen")));
    const inverso = calcularComparacion(actual, base);
    assert.ok(inverso.advertencias.some(a => a.includes("anterior a la base")));
    assert.equal(inverso.general.unidades.diferencia, -5);
});

test("rechaza reportes sin periodo valido y fechas diarias fuera de rango", () => {
    const [base, actual] = par();
    for (const periodo of [{}, { inicio: "2026-02-30", fin: "2026-03-01" }, { inicio: "2026-11-08", fin: "2026-11-02" }]) {
        assert.throws(() => calcularComparacion({ ...base, periodo }, actual), { status: 422 });
    }
    actual.productos[0].VentasPorFecha["2026-11-30"] = { fecha: "2026-11-30", UniKg: 1, VentaTotal: 10 };
    assert.throws(() => calcularComparacion(base, actual), { status: 422 });
});

test("no convierte errores de cantidades en cero y detecta diferencia con el detalle diario", () => {
    for (const UniKg of [undefined, null, "12", NaN, Infinity]) {
        const [base, actual] = par(); actual.productos[0].UniKg = UniKg;
        assert.throws(() => calcularComparacion(base, actual), { status: 422 });
    }
    const [base, actual] = par(); actual.productos[0].UniKg = 999;
    const resultado = calcularComparacion(base, actual);
    assert.ok(resultado.advertencias.some(a => a.includes("no coinciden")));
    assert.equal(resultado.general.unidades.comparado, 999);
});

test("conserva la lectura de historicos e identifica departamentos sin codigo", () => {
    const base = semana(undefined, [{ UnidadMedida: undefined, DTO: "", Departamento: "Almacén" }]);
    const actual = semana("2026-11-09", [{ UnidadMedida: undefined, DTO: "", Departamento: "Almacen" }, { PLU: "003", DTO: "", Departamento: "Bebidas" }]);
    const resultado = calcularComparacion(base, actual);
    assert.equal(resultado.departamentos.length, 2);
    assert.ok(resultado.advertencias.some(a => a.includes("históricas")));
    assert.ok(resultado.advertencias.some(a => a.includes("no tienen código")));
});

test("base negativa conserva la diferencia y no presenta un porcentaje de crecimiento", () => {
    const resultado = calcularComparacion(semana(undefined, [{ VentaTotal: -100 }]), semana("2026-11-09", [{ VentaTotal: 50 }]));
    assert.equal(resultado.general.venta.diferencia, 150);
    assert.equal(resultado.general.venta.porcentaje, null);
    assert.equal(resultado.general.venta.estado, "base-negativa");
});

test("valida IDs, existencia y consulta los snapshots sin escribirlos", async t => {
    const [base, actual] = par();
    let lecturas = 0;
    t.mock.method(Report, "findById", id => ({ lean: async () => { lecturas++; return id === ID_BASE ? base : actual; } }));
    t.mock.method(Report, "create", () => assert.fail("Una comparación no guarda datos."));
    for (const ids of [["malo", ID_ACTUAL], [ID_BASE, ID_BASE], [ID_BASE, ID_BASE.toUpperCase()], [[ID_BASE], ID_ACTUAL]]) {
        await assert.rejects(compararReportesGuardados(...ids), { status: 400 });
    }
    assert.equal(lecturas, 0);
    assert.equal((await compararReportesGuardados(ID_BASE, ID_ACTUAL)).general.venta.diferencia, 30);
    t.mock.method(Report, "findById", () => ({ lean: async () => null }));
    await assert.rejects(compararReportesGuardados(ID_BASE, ID_ACTUAL), { status: 404 });
    t.mock.method(Report, "findById", id => ({ lean: async () => id === ID_BASE ? base : null }));
    await assert.rejects(compararReportesGuardados(ID_BASE, ID_ACTUAL), { status: 404 });
});

test("la ruta de comparacion precede al detalle y exige permiso para ver reportes", () => {
    const rutas = reportRoutes.stack.filter(capa => capa.route).map(capa => capa.route);
    const indice = rutas.findIndex(ruta => ruta.path === "/compare");
    assert.ok(indice >= 0 && indice < rutas.findIndex(ruta => ruta.path === "/:id"));
    const permiso = rutas[indice].stack[0].handle;
    let estado;
    permiso({ usuario: { rol: "operador" } }, { status(valor) { estado = valor; return { json() {} }; } }, () => assert.fail("Sin permiso."));
    assert.equal(estado, 403);
    let permitido = false;
    permiso({ usuario: { rol: "gerente" } }, {}, () => { permitido = true; });
    assert.equal(permitido, true);
});
