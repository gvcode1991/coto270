import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { Report } from "../models/Report.js";
import { paginar } from "../lib/pagination.js";
import { obtenerTipoUnidad } from "../../src/lib/products.js";

export async function guardarReporte(datos, usuario) {
    const reporte = normalizarReporte(datos);
    const huellaContenido = huella(reporte);
    await Report.init();
    const existente = await buscarDuplicado(reporte, huellaContenido);
    if (existente) return resultadoDuplicado(existente);
    try {
        const guardado = await Report.create({
            ...reporte, huellaContenido, versionFormato: 2,
            autor: usuario ? { id: usuario.id, nombre: [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") } : undefined
        });
        return { reporte: sinProductos(guardado), actualizado: false, duplicado: false };
    } catch (error) {
        if (error.code !== 11000) throw error;
        // Los índices resuelven también dos cargas simultáneas del mismo contenido.
        const duplicado = await buscarDuplicado(reporte, huellaContenido);
        if (duplicado) return resultadoDuplicado(duplicado);
        throw conflicto();
    }
}

async function buscarDuplicado(reporte, hash) {
    const porHuella = await Report.findOne({ huellaContenido: hash }).select("-productos -huellaContenido");
    if (porHuella) return porHuella;
    const periodo = { "periodo.inicio": reporte.periodo.inicio, "periodo.fin": reporte.periodo.fin };
    // Los históricos se comparan sin escribirles hashes ni migrarlos.
    const anteriores = await Report.find({ ...periodo, huellaContenido: { $exists: false } }).lean();
    for (const anterior of anteriores) {
        let igual = false;
        try { igual = huella(normalizarReporte(anterior)) === hash; }
        catch (error) { if (error.status !== 400) throw error; }
        if (igual) return sinProductos(anterior);
    }
    if (await Report.exists({ ...periodo, nombreArchivo: reporte.nombreArchivo })) throw conflicto();
    return null;
}

export async function listarReportes(parametros = {}) {
    const filtro = {};
    if (parametros.busqueda != null && parametros.busqueda !== "") {
        const texto = cadena(parametros.busqueda, "búsqueda", 120);
        filtro.nombreArchivo = { $regex: texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }
    for (const campo of ["desde", "hasta"]) {
        if (parametros[campo]) validarFecha(parametros[campo]);
    }
    if (parametros.desde && parametros.hasta && parametros.desde > parametros.hasta) throw errorDatos("El inicio no puede ser posterior al fin.");
    if (parametros.desde) filtro["periodo.fin"] = { $gte: parametros.desde };
    if (parametros.hasta) filtro["periodo.inicio"] = { $lte: parametros.hasta, $ne: "" };
    const { registros, paginacion } = await paginar(Report, filtro, parametros, {
        orden: { "periodo.inicio": -1, createdAt: -1, _id: -1 }, seleccion: "-productos -huellaContenido"
    });
    return { reportes: registros, paginacion };
}

export async function obtenerReporte(id) {
    if (!mongoose.isObjectIdOrHexString(id)) throw errorDatos("El identificador del reporte no es válido.");
    return Report.findById(id).select("-huellaContenido");
}

export function normalizarReporte(datos) {
    if (!Array.isArray(datos?.productos) || !datos.productos.length) throw errorDatos("El reporte no contiene productos válidos.");
    const productos = datos.productos.map((producto, indice) => {
        const contexto = `producto ${indice + 1}`;
        const nombre = cadena(producto?.Producto, contexto, 500);
        const entradas = producto.VentasPorFecha instanceof Map
            ? Array.from(producto.VentasPorFecha.entries()) : Object.entries(producto.VentasPorFecha || {});
        const VentasPorFecha = Object.fromEntries(entradas.sort(([a], [b]) => a.localeCompare(b)).map(([fecha, venta]) => {
            validarFecha(fecha);
            if (!venta || venta.fecha !== fecha) throw errorDatos(`La fecha diaria de ${contexto} no coincide con su columna.`);
            return [fecha, {
                fecha, etiqueta: cadena(venta.etiqueta || fecha, "etiqueta de fecha", 100),
                UniKg: numero(venta.UniKg, contexto), VentaTotal: numero(venta.VentaTotal, contexto)
            }];
        }));
        const UnidadMedida = producto.UnidadMedida || obtenerTipoUnidad(nombre);
        if (!["uni", "kg"].includes(UnidadMedida)) throw errorDatos(`La medida de ${contexto} debe ser UNI o KG.`);
        return {
            PLU: cadena(typeof producto.PLU === "number" ? String(producto.PLU) : producto.PLU, contexto, 80),
            Producto: nombre, DTO: cadena(producto.DTO == null ? "" : String(producto.DTO), "departamento", 120, true),
            Departamento: cadena(producto.Departamento || "", "departamento", 300, true),
            UnidadMedida, UniKg: numero(producto.UniKg, contexto), VentaTotal: numero(producto.VentaTotal, contexto), VentasPorFecha
        };
    });
    const fechas = [...new Set(productos.flatMap(p => Object.keys(p.VentasPorFecha)))].sort();
    const resumen = productos.reduce((total, producto) => {
        total.productos += 1;
        total.unidadesKg += producto.UniKg; // Campo legado para clientes anteriores.
        total[producto.UnidadMedida === "uni" ? "unidades" : "kilogramos"] += producto.UniKg;
        total.ventaTotal += producto.VentaTotal;
        return total;
    }, { productos: 0, unidadesKg: 0, unidades: 0, kilogramos: 0, ventaTotal: 0 });
    if (Object.values(resumen).some(valor => !Number.isFinite(valor))) throw errorDatos("Los totales exceden el rango admitido.");
    return {
        nombreArchivo: cadena(datos.nombreArchivo || "reporte-sin-nombre", "nombre del archivo", 255),
        periodo: { inicio: fechas[0] || "", fin: fechas.at(-1) || "", fechas }, resumen, productos
    };
}

function huella(reporte) {
    // La posición de las filas y el nombre del archivo no definen un reporte distinto.
    const filas = reporte.productos.map(producto => JSON.stringify(producto)).sort();
    return createHash("sha256").update(JSON.stringify(filas)).digest("hex");
}
function resultadoDuplicado(reporte) { return { reporte, actualizado: false, duplicado: true }; }
function sinProductos(reporte) {
    const { productos, huellaContenido, ...resumen } = reporte.toObject ? reporte.toObject() : reporte;
    return resumen;
}
function conflicto() {
    return Object.assign(new Error("Ya existe un reporte con ese nombre y período, pero con datos diferentes. El histórico no se modificó. Usá otro nombre para guardar una revisión independiente."), { status: 409 });
}
function errorDatos(mensaje) { return Object.assign(new Error(mensaje), { status: 400 }); }
function cadena(valor, campo, maximo, vacio = false) {
    if (typeof valor !== "string" || (!vacio && !valor.trim()) || valor.trim().length > maximo || /[\x00-\x1f\x7f]/.test(valor)) throw errorDatos(`El campo ${campo} no es válido.`);
    return valor.trim();
}
function numero(valor, campo) {
    if (!["number", "string"].includes(typeof valor) || !String(valor).trim() || !Number.isFinite(Number(valor))) throw errorDatos(`Hay cantidades o ventas inválidas en ${campo}.`);
    return Number(valor);
}
function validarFecha(fecha) {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw errorDatos("El período debe contener fechas válidas (AAAA-MM-DD).");
    const valor = new Date(`${fecha}T00:00:00Z`);
    if (!Number.isFinite(valor.getTime()) || valor.toISOString().slice(0, 10) !== fecha) throw errorDatos("El período contiene una fecha inexistente.");
}
