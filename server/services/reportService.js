import { Report } from "../models/Report.js";
import { paginar } from "../lib/pagination.js";

export async function guardarReporte(datos) {
    const reporte = normalizarReporte(datos);
    const filtro = {
        nombreArchivo: reporte.nombreArchivo,
        "periodo.inicio": reporte.periodo.inicio,
        "periodo.fin": reporte.periodo.fin
    };

    const existente = await Report.exists(filtro);
    const guardado = await Report.findOneAndUpdate(
        filtro,
        { $set: reporte },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    ).select("-productos");

    return {
        reporte: guardado,
        actualizado: Boolean(existente)
    };
}

export async function listarReportes(parametros = {}) {
    const { registros, paginacion } = await paginar(Report, {}, parametros, {
        orden: { "periodo.inicio": -1, createdAt: -1, _id: -1 }, seleccion: "-productos"
    });
    return { reportes: registros, paginacion };
}

export async function obtenerReporte(id) {
    return Report.findById(id);
}

function normalizarReporte(datos) {
    const productos = Array.isArray(datos.productos)
        ? datos.productos.filter(producto => producto?.PLU && producto?.Producto)
        : [];

    if (!productos.length) {
        const error = new Error("El reporte no contiene productos validos.");
        error.status = 400;
        throw error;
    }

    const fechas = Array.from(
        new Set(
            productos.flatMap(producto =>
                Object.keys(producto.VentasPorFecha || {})
            )
        )
    ).sort();

    return {
        nombreArchivo: String(datos.nombreArchivo || "reporte-sin-nombre").trim(),
        periodo: {
            inicio: fechas[0] || "",
            fin: fechas.at(-1) || "",
            fechas
        },
        resumen: productos.reduce(
            (total, producto) => {
                total.productos += 1;
                total.unidadesKg += numeroSeguro(producto.UniKg);
                total.ventaTotal += numeroSeguro(producto.VentaTotal);
                return total;
            },
            { productos: 0, unidadesKg: 0, ventaTotal: 0 }
        ),
        productos: productos.map(producto => ({
            PLU: String(producto.PLU).trim(),
            Producto: String(producto.Producto).trim(),
            DTO: String(producto.DTO || "").trim(),
            Departamento: String(producto.Departamento || "").trim(),
            UniKg: numeroSeguro(producto.UniKg),
            VentaTotal: numeroSeguro(producto.VentaTotal),
            VentasPorFecha: producto.VentasPorFecha || {}
        }))
    };
}

function numeroSeguro(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}
