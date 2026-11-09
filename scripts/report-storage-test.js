import assert from "node:assert/strict";
import { test } from "node:test";
import { Report } from "../server/models/Report.js";
import { guardarReporte, normalizarReporte, listarReportes, obtenerReporte } from "../server/services/reportService.js";

const autor = { id: "507f1f77bcf86cd799439011", nombre: "Persona", apellido: "Prueba" };
function datos() {
    return { nombreArchivo: "Ventas.ods", productos: [
        { PLU: "001", Producto: "PAN 1 UNI", DTO: "25", Departamento: "PANADERIA", UniKg: 3, VentaTotal: 1500,
            VentasPorFecha: { "2026-11-02": { fecha: "2026-11-02", etiqueta: "02/11/2026", UniKg: 3, VentaTotal: 1500 } } },
        { PLU: "002", Producto: "PASTAS 1 KGM", DTO: "28", Departamento: "PASTAS", UniKg: 1.25, VentaTotal: 4000,
            VentasPorFecha: { "2026-11-08": { fecha: "2026-11-08", etiqueta: "08/11/2026", UniKg: 1.25, VentaTotal: 4000 } } }
    ] };
}

function simular(t, iniciales = []) {
    t.mock.method(Report, "init", async () => Report);
    const filas = structuredClone(iniciales);
    t.mock.method(Report, "findOne", filtro => ({ select: async () => filas.find(fila => fila.huellaContenido === filtro.huellaContenido) || null }));
    t.mock.method(Report, "find", filtro => ({ lean: async () => filas.filter(fila => !fila.huellaContenido && fila.periodo.inicio === filtro["periodo.inicio"] && fila.periodo.fin === filtro["periodo.fin"]) }));
    t.mock.method(Report, "exists", async filtro => filas.find(fila => fila.nombreArchivo === filtro.nombreArchivo && fila.periodo.inicio === filtro["periodo.inicio"] && fila.periodo.fin === filtro["periodo.fin"]));
    const crear = t.mock.method(Report, "create", async documento => {
        const guardado = structuredClone({ ...documento, _id: `id-${filas.length}` }); filas.push(guardado); return guardado;
    });
    return { filas, crear };
}

test("guarda un snapshot con periodo, medidas y autor de la sesion sin cambiar las ventas", async t => {
    const { filas } = simular(t);
    const original = datos();
    const resultado = await guardarReporte({ ...original, autor: { nombre: "Falso" }, resumen: { ventaTotal: 1 } }, autor);
    assert.equal(resultado.duplicado, false);
    assert.equal(resultado.reporte.productos, undefined);
    assert.equal(resultado.reporte.huellaContenido, undefined);
    assert.deepEqual(filas[0].autor, autor && { id: autor.id, nombre: "Persona Prueba" });
    assert.deepEqual(filas[0].periodo, { inicio: "2026-11-02", fin: "2026-11-08", fechas: ["2026-11-02", "2026-11-08"] });
    assert.deepEqual(filas[0].resumen, { productos: 2, unidadesKg: 4.25, unidades: 3, kilogramos: 1.25, ventaTotal: 5500 });
    assert.equal(filas[0].productos[0].PLU, "001");
    assert.deepEqual(filas[0].productos[1].VentasPorFecha, original.productos[1].VentasPorFecha);
    assert.equal(original.productos[0].UnidadMedida, undefined);
});

test("repetir un reporte, renombrarlo o reordenar sus filas no crea ni sobrescribe documentos", async t => {
    const { filas, crear } = simular(t);
    await guardarReporte(datos(), autor);
    const antes = structuredClone(filas);
    const repetido = datos(); repetido.nombreArchivo = "Otro nombre.xlsx"; repetido.productos.reverse();
    const resultado = await guardarReporte(repetido, { ...autor, nombre: "Otra persona" });
    assert.equal(resultado.duplicado, true);
    assert.equal(crear.mock.callCount(), 1);
    assert.deepEqual(filas, antes);
});

test("el mismo nombre y periodo con datos distintos da conflicto y conserva el original", async t => {
    const { filas, crear } = simular(t);
    await guardarReporte(datos(), autor);
    const antes = structuredClone(filas);
    const diferente = datos(); diferente.productos[0].VentaTotal = 99;
    await assert.rejects(guardarReporte(diferente, autor), { status: 409 });
    assert.equal(crear.mock.callCount(), 1);
    assert.deepEqual(filas, antes);
    diferente.nombreArchivo = "Ventas revisadas.ods";
    await guardarReporte(diferente, autor);
    assert.equal(filas.length, 2);
});

test("un periodo diferente conserva un reporte independiente", async t => {
    const { filas } = simular(t);
    await guardarReporte(datos(), autor);
    const siguiente = datos();
    siguiente.productos.forEach(p => { p.VentasPorFecha = { "2026-11-09": { fecha: "2026-11-09", etiqueta: "09/11/2026", UniKg: p.UniKg, VentaTotal: p.VentaTotal } }; });
    await guardarReporte(siguiente, autor);
    assert.equal(filas.length, 2);
});

test("detecta copias de historicos sin modificarlos ni exigir migracion", async t => {
    const historico = { ...datos(), periodo: { inicio: "2026-11-02", fin: "2026-11-08" }, _id: "historico" };
    const { filas, crear } = simular(t, [historico]);
    const copia = datos(); copia.nombreArchivo = "Renombrado.ods";
    assert.equal((await guardarReporte(copia, autor)).reporte._id, "historico");
    assert.equal(crear.mock.callCount(), 0);
    assert.deepEqual(filas[0], historico);
});

test("rechaza datos y fechas invalidos antes de escribir, sin convertir texto en cero", async t => {
    const { crear } = simular(t);
    for (const valor of [null, "", " ", "abc", Infinity, NaN, {}]) {
        const invalido = datos(); invalido.productos[0].VentaTotal = valor;
        await assert.rejects(guardarReporte(invalido, autor), { status: 400 });
    }
    for (const fecha of ["2026-02-30", "02/11/2026", "__proto__"]) {
        const invalido = datos(); invalido.productos[0].VentasPorFecha = { [fecha]: { fecha, etiqueta: fecha, UniKg: 1, VentaTotal: 1 } };
        await assert.rejects(guardarReporte(invalido, autor), { status: 400 });
    }
    const incoherente = datos(); incoherente.productos[0].VentasPorFecha["2026-11-02"].fecha = "2026-11-03";
    await assert.rejects(guardarReporte(incoherente, autor), { status: 400 });
    const sinProducto = datos(); sinProducto.productos.push({ Producto: "" });
    await assert.rejects(guardarReporte(sinProducto, autor), { status: 400 });
    assert.equal(crear.mock.callCount(), 0);
});

test("preserva ceros, negativos, medidas explicitas y reportes sin fecha sin inventar semana", () => {
    const entrada = datos();
    entrada.productos[0] = { ...entrada.productos[0], UniKg: 0, VentaTotal: -10, UnidadMedida: "kg", VentasPorFecha: {} };
    entrada.productos[1].VentasPorFecha = {};
    const salida = normalizarReporte(entrada);
    assert.equal(salida.resumen.ventaTotal, 3990);
    assert.equal(salida.resumen.unidades, 0);
    assert.equal(salida.resumen.kilogramos, 1.25);
    assert.equal(salida.periodo.inicio, "");
});

test("resuelve la carrera de insercion duplicada y propaga fallos de guardado", async t => {
    simular(t);
    let creado = null;
    t.mock.method(Report, "findOne", () => ({ select: async () => creado }));
    t.mock.method(Report, "create", async documento => { creado = { ...documento, _id: "simultaneo" }; throw Object.assign(new Error("duplicado"), { code: 11000 }); });
    assert.equal((await guardarReporte(datos(), autor)).duplicado, true);
    creado = null;
    t.mock.method(Report, "create", async () => { throw new Error("MongoDB no disponible"); });
    await assert.rejects(guardarReporte(datos(), autor), /MongoDB no disponible/);
});

test("filtra por nombre literal y solapamiento de periodo sin cambiar la paginacion", async t => {
    t.mock.method(Report, "countDocuments", async filtro => {
        assert.deepEqual(filtro, { nombreArchivo: { $regex: "ventas\\.ods", $options: "i" }, "periodo.fin": { $gte: "2026-11-02" }, "periodo.inicio": { $lte: "2026-11-08", $ne: "" } });
        return 0;
    });
    t.mock.method(Report, "find", () => {
        const consulta = { sort() { return consulta; }, select() { return consulta; }, skip() { return consulta; }, limit() { return consulta; }, then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); } };
        return consulta;
    });
    const listado = await listarReportes({ busqueda: "ventas.ods", desde: "2026-11-02", hasta: "2026-11-08" });
    assert.equal(listado.paginacion.total, 0);
    await assert.rejects(listarReportes({ desde: "2026-11-08", hasta: "2026-11-02" }), { status: 400 });
    await assert.rejects(listarReportes({ desde: "2026-02-30" }), { status: 400 });
    await assert.rejects(obtenerReporte("invalido"), { status: 400 });
});

test("mantiene el indice legado y agrega unicidad solo para huellas existentes", () => {
    const indices = Report.schema.indexes();
    assert.ok(indices.some(([campos, opciones]) => campos.huellaContenido === 1 && opciones.unique && opciones.sparse));
    assert.ok(indices.some(([campos, opciones]) => campos.nombreArchivo === 1 && opciones.unique));
});

test("si no se pueden preparar los indices no confirma ni intenta insertar", async t => {
    const { crear } = simular(t);
    t.mock.method(Report, "init", async () => { throw new Error("Indice no disponible"); });
    await assert.rejects(guardarReporte(datos(), autor), /Indice no disponible/);
    assert.equal(crear.mock.callCount(), 0);
});
