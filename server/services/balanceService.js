import { Balance } from "../models/Balance.js";

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

export async function listarBalances() {
    return Balance.find()
        .sort({ fecha: -1, createdAt: -1 })
        .limit(36);
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
    const cantidad = producto?.CantidadContada;

    if (!PLU || !Producto || !Departamento) return null;

    return {
        PLU,
        Producto,
        DTO: String(producto.DTO || "").trim(),
        Departamento,
        UnidadMedida,
        CantidadContada: cantidad === "" || cantidad === null || cantidad === undefined
            ? null
            : Math.max(0, Number(cantidad) || 0)
    };
}
