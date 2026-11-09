import mongoose from "mongoose";
import { Report } from "../models/Report.js";
import { obtenerTipoUnidad } from "../../src/lib/products.js";

const DIA = 86400000;

export async function compararReportesGuardados(baseId, comparadoId) {
    if (![baseId, comparadoId].every(id => typeof id === "string" && mongoose.isObjectIdOrHexString(id))) {
        throw error("Seleccioná dos reportes válidos.", 400);
    }
    if (baseId.toLowerCase() === comparadoId.toLowerCase()) throw error("Seleccioná dos reportes distintos.", 400);
    const base = await Report.findById(baseId).lean();
    if (!base) throw error("El reporte base ya no está disponible.", 404);
    const comparado = await Report.findById(comparadoId).lean();
    if (!comparado) throw error("El reporte a comparar ya no está disponible.", 404);
    return calcularComparacion(base, comparado);
}

export function calcularComparacion(base, comparado) {
    const advertencias = new Set();
    const anterior = preparar(base, "base", advertencias);
    const actual = preparar(comparado, "comparado", advertencias);
    if (anterior.meta.dias !== actual.meta.dias) advertencias.add("Los períodos tienen distinta duración. Los totales no se ajustaron por cantidad de días.");
    if (actual.meta.periodo.inicio <= anterior.meta.periodo.fin && actual.meta.periodo.fin >= anterior.meta.periodo.inicio) {
        advertencias.add("Los períodos se superponen: esta selección no representa dos semanas independientes.");
    }
    if (actual.meta.periodo.inicio < anterior.meta.periodo.inicio) advertencias.add("La semana comparada es anterior a la base. Se respeta el orden que seleccionaste.");

    const incompatibles = new Set();
    for (const plu of new Set([...anterior.productos.keys(), ...actual.productos.keys()])) {
        const a = anterior.productos.get(plu), b = actual.productos.get(plu);
        if (a?.medidas.size > 1 || b?.medidas.size > 1 || (a && b && [...a.medidas][0] !== [...b.medidas][0])) incompatibles.add(plu);
        if (a && b && JSON.stringify([...a.departamentos].sort()) !== JSON.stringify([...b.departamentos].sort())) {
            advertencias.add("Hay productos que cambiaron de departamento. Las variaciones por departamento incluyen esos movimientos.");
        }
    }
    if (incompatibles.size) advertencias.add("Hay PLU con medidas distintas o ambiguas. No se calcula su variación de cantidades, ni la de los totales que afectan; las ventas en pesos siguen comparándose.");

    const productos = unir(anterior.productos, actual.productos, (a, b, plu) => ({
        plu, nombre: b?.nombre || a.nombre,
        nombreBase: a?.nombre || "", nombreComparado: b?.nombre || "",
        estado: !a ? "solo-comparado" : !b ? "solo-base" : "ambos",
        departamentosBase: a ? [...a.departamentos] : [], departamentosComparado: b ? [...b.departamentos] : [],
        ...metricas(a?.totales, b?.totales, !incompatibles.has(plu))
    }));
    const departamentos = unir(anterior.departamentos, actual.departamentos, (a, b, clave) => ({
        clave, nombre: b?.nombre || a.nombre, codigo: b?.codigo ?? a?.codigo ?? "",
        ...metricas(a?.totales, b?.totales, ![...(a?.plus || []), ...(b?.plus || [])].some(plu => incompatibles.has(plu)))
    }));
    productos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.plu.localeCompare(b.plu));
    departamentos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return {
        base: anterior.meta, comparado: actual.meta, advertencias: [...advertencias],
        general: metricas(anterior.totales, actual.totales, incompatibles.size === 0), departamentos, productos
    };
}

function preparar(reporte, etiqueta, advertencias) {
    const periodo = reporte?.periodo;
    const inicio = fecha(periodo?.inicio), fin = fecha(periodo?.fin);
    if (inicio === null || fin === null || fin < inicio) throw error(`El reporte ${etiqueta} no tiene un período válido. No se puede comparar por semanas.`, 422);
    if (!Array.isArray(reporte.productos) || !reporte.productos.length) throw error(`El reporte ${etiqueta} no tiene productos para comparar.`, 422);
    const dias = Math.round((fin - inicio) / DIA) + 1;
    if (periodo.fechas != null && !Array.isArray(periodo.fechas)) throw error(`Las fechas del reporte ${etiqueta} no son válidas.`, 422);
    const fechasDeclaradas = new Set(periodo.fechas || []);
    const fechasDiarias = new Set();
    const productos = new Map(), departamentos = new Map(), totales = vacio();
    let diarioCompleto = true;
    for (const producto of reporte.productos) {
        const plu = String(producto.PLU ?? "").trim();
        if (!plu) throw error(`Hay un producto sin PLU en el reporte ${etiqueta}.`, 422);
        const medida = producto.UnidadMedida || obtenerTipoUnidad(producto.Producto);
        if (!["uni", "kg"].includes(medida)) throw error(`El PLU ${plu} tiene una medida inválida.`, 422);
        if (!producto.UnidadMedida) advertencias.add("Algunas medidas históricas se infieren de la descripción (UNI; el resto KG). Verificá su clasificación antes de interpretar las cantidades.");
        const cantidad = numero(producto.UniKg), venta = numero(producto.VentaTotal);
        const codigo = String(producto.DTO ?? "").trim();
        const nombreDepartamento = String(producto.Departamento || "Sin departamento").trim();
        const clave = codigo ? `codigo:${codigo}` : `nombre:${nombreDepartamento.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()}`;
        if (!codigo) advertencias.add("Algunos departamentos no tienen código y se vinculan por su nombre. Un cambio de nombre puede mostrarse como departamentos distintos.");
        if (!productos.has(plu)) productos.set(plu, { nombre: String(producto.Producto || plu), totales: vacio(), medidas: new Set(), departamentos: new Set() });
        if (!departamentos.has(clave)) departamentos.set(clave, { codigo, nombre: nombreDepartamento, totales: vacio(), plus: new Set() });
        const item = productos.get(plu), departamento = departamentos.get(clave);
        item.medidas.add(medida); item.departamentos.add(clave); departamento.plus.add(plu);
        sumar(item.totales, medida, cantidad, venta); sumar(departamento.totales, medida, cantidad, venta); sumar(totales, medida, cantidad, venta);

        const ventas = producto.VentasPorFecha instanceof Map ? [...producto.VentasPorFecha.entries()] : Object.entries(producto.VentasPorFecha || {});
        if (!ventas.length) diarioCompleto = false;
        let cantidadDiaria = 0, ventaDiaria = 0;
        for (const [dia, datos] of ventas) {
            const instante = fecha(dia);
            if (instante === null || instante < inicio || instante > fin || datos?.fecha !== dia) throw error(`Hay fechas diarias inconsistentes en el reporte ${etiqueta}.`, 422);
            fechasDiarias.add(dia);
            cantidadDiaria += numero(datos.UniKg); ventaDiaria += numero(datos.VentaTotal);
        }
        if (ventas.length && (Math.abs(cantidadDiaria - cantidad) > 0.000001 || Math.abs(ventaDiaria - venta) > 0.01)) {
            advertencias.add("Hay totales semanales que no coinciden con el detalle diario. Se comparan los totales guardados, sin recalcularlos.");
        }
    }
    for (const dia of fechasDeclaradas) {
        const valor = fecha(dia);
        if (valor === null || valor < inicio || valor > fin) throw error(`El período del reporte ${etiqueta} contiene fechas inconsistentes.`, 422);
    }
    if (dias !== 7 || fechasDiarias.size !== 7 || !diarioCompleto) {
        advertencias.add(`El reporte ${etiqueta} no acredita una semana completa: rango de ${dias} días, ${fechasDiarias.size} fechas con detalle. No se extrapolan ventas.`);
    }
    return { productos, departamentos, totales, meta: {
        id: String(reporte._id), nombreArchivo: reporte.nombreArchivo,
        periodo: { inicio: periodo.inicio, fin: periodo.fin }, dias, fechasConDetalle: fechasDiarias.size
    } };
}

function metricas(a = vacio(), b = vacio(), cantidadesComparables = true) {
    return {
        unidades: variacion(a.uni, b.uni, cantidadesComparables),
        kilogramos: variacion(a.kg, b.kg, cantidadesComparables),
        venta: variacion(a.venta, b.venta)
    };
}

function variacion(base, comparado, comparable = true) {
    const diferencia = comparable ? comparado - base : null;
    const porcentaje = comparable && base > 0 ? diferencia / base * 100 : null;
    if ((diferencia !== null && !Number.isFinite(diferencia)) || (porcentaje !== null && !Number.isFinite(porcentaje))) throw error("La variación excede el rango numérico admitido.", 422);
    return { base, comparado, diferencia, porcentaje, estado: !comparable ? "medida-incompatible" : base === 0 ? "sin-base" : base < 0 ? "base-negativa" : "comparable" };
}
function unir(a, b, transformar) { return [...new Set([...a.keys(), ...b.keys()])].map(clave => transformar(a.get(clave), b.get(clave), clave)); }
function vacio() { return { uni: 0, kg: 0, venta: 0 }; }
function sumar(total, medida, cantidad, venta) {
    total[medida] += cantidad; total.venta += venta;
    if (Object.values(total).some(valor => !Number.isFinite(valor))) throw error("Los totales exceden el rango numérico admitido.", 422);
}
function numero(valor) {
    if (typeof valor !== "number" || !Number.isFinite(valor)) throw error("Hay cantidades o ventas inválidas en un reporte. No se reemplazan por cero.", 422);
    return valor;
}
function fecha(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
    const tiempo = Date.parse(`${valor}T00:00:00Z`);
    return Number.isFinite(tiempo) && new Date(tiempo).toISOString().slice(0, 10) === valor ? tiempo : null;
}
function error(mensaje, status) { return Object.assign(new Error(mensaje), { status }); }
