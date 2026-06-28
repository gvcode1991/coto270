import { CatalogProduct } from "../models/CatalogProduct.js";

export async function listarCatalogo(filtros = {}) {
    const consulta = {};
    const busqueda = String(filtros.busqueda || "").trim();

    if (filtros.categoria && ["producto-final", "materia-prima"].includes(filtros.categoria)) {
        consulta.Categoria = filtros.categoria;
    }

    if (filtros.activo !== "todos") {
        consulta.Activo = filtros.activo === "false" ? false : true;
    }

    if (busqueda) {
        consulta.$or = [
            { PLU: new RegExp(escaparRegex(busqueda), "i") },
            { Producto: new RegExp(escaparRegex(busqueda), "i") },
            { Departamento: new RegExp(escaparRegex(busqueda), "i") }
        ];
    }

    return CatalogProduct.find(consulta)
        .sort({ Departamento: 1, Producto: 1 })
        .limit(800);
}

export async function guardarProductoCatalogo(datos) {
    const producto = normalizarProductoCatalogo(datos);

    return CatalogProduct.findOneAndUpdate(
        { PLU: producto.PLU },
        { $set: producto },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );
}

export async function importarProductosCatalogo(productos = []) {
    const productosNormalizados = productos
        .map(normalizarProductoCatalogo)
        .filter(Boolean);

    if (!productosNormalizados.length) {
        const error = new Error("No hay productos validos para importar al catalogo.");
        error.status = 400;
        throw error;
    }

    const operaciones = productosNormalizados.map(producto => ({
        updateOne: {
            filter: { PLU: producto.PLU },
            update: { $set: producto },
            upsert: true
        }
    }));

    const resultado = await CatalogProduct.bulkWrite(operaciones, { ordered: false });

    return {
        recibidos: productosNormalizados.length,
        creados: resultado.upsertedCount || 0,
        actualizados: resultado.modifiedCount || 0
    };
}

export async function eliminarProductoCatalogo(plu) {
    return CatalogProduct.findOneAndDelete({ PLU: String(plu || "").trim() });
}

function normalizarProductoCatalogo(datos) {
    const PLU = String(datos && datos.PLU || "").trim();
    const Producto = String(datos && datos.Producto || "").trim();
    const Departamento = String(datos && datos.Departamento || "").trim();

    if (!PLU || !Producto || !Departamento) {
        const error = new Error("Complete PLU, producto y departamento.");
        error.status = 400;
        throw error;
    }

    return {
        PLU,
        Producto,
        DTO: String(datos.DTO || "").trim(),
        Departamento,
        UnidadMedida: datos.UnidadMedida === "uni" ? "uni" : "kg",
        Categoria: datos.Categoria === "materia-prima" ? "materia-prima" : "producto-final",
        Activo: datos.Activo === false ? false : true
    };
}

function escaparRegex(valor) {
    return String(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
