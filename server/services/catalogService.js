import { CatalogProduct } from "../models/CatalogProduct.js";
import { isObjectIdOrHexString } from "mongoose";
import { paginar } from "../lib/pagination.js";

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

    const { registros, paginacion } = await paginar(CatalogProduct, consulta, filtros, {
        orden: { Departamento: 1, Producto: 1, _id: 1 }
    });
    return { productos: registros, paginacion };
}

export async function guardarProductoCatalogo(datos) {
    const producto = normalizarProductoCatalogo(datos);
    const id = String(datos.id || "").trim();

    if (id && !isObjectIdOrHexString(id)) {
        throw errorCatalogo("El identificador del producto no es valido.", 400);
    }

    try {
        if (!id) return await CatalogProduct.create(producto);

        const actualizado = await CatalogProduct.findOneAndUpdate(
            { _id: id },
            { $set: producto },
            { new: true, upsert: false, runValidators: true }
        );
        if (!actualizado) {
            throw errorCatalogo("El producto ya no existe en el inventario. Actualice la lista.", 404);
        }
        return actualizado;
    } catch (error) {
        if (error.code === 11000) {
            throw errorCatalogo(`El PLU ${producto.PLU} ya pertenece a otro producto. Use la opcion Editar para modificarlo.`, 409);
        }
        throw error;
    }
}

export async function importarProductosCatalogo(productos = []) {
    if (!Array.isArray(productos)) {
        throw errorCatalogo("La lista de productos para importar no es valida.", 400);
    }
    const productosNormalizados = productos
        .map(normalizarProductoCatalogo)
        .filter(Boolean);

    if (!productosNormalizados.length) {
        const error = new Error("No hay productos validos para importar al inventario.");
        error.status = 400;
        throw error;
    }

    const productosUnicos = [...new Map(productosNormalizados.map(producto => [producto.PLU, producto])).values()];
    const fechaImportacion = new Date();
    const operaciones = productosUnicos.map(producto => ({
        updateOne: {
            filter: { PLU: producto.PLU },
            update: { $setOnInsert: { ...producto, createdAt: fechaImportacion, updatedAt: fechaImportacion } },
            upsert: true,
            timestamps: false
        }
    }));

    const resultado = await CatalogProduct.bulkWrite(operaciones, { ordered: false });

    return {
        recibidos: productosNormalizados.length,
        unicos: productosUnicos.length,
        duplicados: productosNormalizados.length - productosUnicos.length,
        creados: resultado.upsertedCount || 0,
        conservados: productosUnicos.length - (resultado.upsertedCount || 0),
        actualizados: 0
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

function errorCatalogo(mensaje, status) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}
