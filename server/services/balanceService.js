import { Balance } from "../models/Balance.js";
import { normalizarCantidadProducto } from "../../src/lib/balanceQuantities.js";
import { paginar } from "../lib/pagination.js";

export async function guardarBalance(datos) {
    const balance = normalizarBalance(datos);
    const filtro = datos.id
        ? { _id: datos.id }
        : { fecha: balance.fecha, tipo: balance.tipo };

    return Balance.findOneAndUpdate(
        filtro,
        { $set: balance },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );
}

export async function listarBalances(parametros = {}) {
    const { registros, paginacion } = await paginar(Balance, {}, parametros, {
        orden: { fecha: -1, createdAt: -1, _id: -1 }
    });
    return { balances: registros, paginacion };
}

export async function eliminarBalance(id) {
    return Balance.findByIdAndDelete(id);
}

function normalizarBalance(datos) {
    const fecha = String(datos.fecha || "").trim();
    const tipo = String(datos.tipo || "").trim();
    const productos = Array.isArray(datos.productos)
        ? datos.productos.map(normalizarProducto).filter(Boolean)
        : [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const error = new Error("Seleccione una fecha valida para el balance.");
        error.status = 400;
        throw error;
    }

    if (!["parcial-1", "parcial-2", "cierre"].includes(tipo)) {
        const error = new Error("Seleccione el tipo de balance.");
        error.status = 400;
        throw error;
    }

    if (!productos.length) {
        const error = new Error("Agregue al menos un producto al balance.");
        error.status = 400;
        throw error;
    }

    const pluUnicos = new Set();
    const productosSinDuplicados = productos.filter(producto => {
        if (pluUnicos.has(producto.PLU)) return false;
        pluUnicos.add(producto.PLU);
        return true;
    });

    return {
        fecha,
        tipo,
        periodo: fecha.slice(0, 7),
        estado: datos.estado === "contado" ? "contado" : "preparacion",
        productos: productosSinDuplicados
    };
}

function normalizarProducto(producto) {
    const PLU = String(producto?.PLU || "").trim();
    const Producto = String(producto?.Producto || "").trim();
    const Departamento = String(producto?.Departamento || "").trim();
    const UnidadMedida = producto?.UnidadMedida === "uni" ? "uni" : "kg";
    const Categoria = producto?.Categoria === "materia-prima" ? "materia-prima" : "producto-final";

    if (!PLU || !Producto || !Departamento) return null;

    return {
        PLU,
        Producto,
        DTO: String(producto.DTO || "").trim(),
        Departamento,
        UnidadMedida,
        Categoria,
        CantidadContada: normalizarCantidadProducto({ ...producto, UnidadMedida })
    };
}
