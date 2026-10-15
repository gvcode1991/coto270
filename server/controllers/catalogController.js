import {
    eliminarProductoCatalogo,
    guardarProductoCatalogo,
    importarProductosCatalogo,
    listarCatalogo
} from "../services/catalogService.js";

export async function obtenerCatalogo(req, res, next) {
    try {
        res.json(await listarCatalogo(req.query));
    } catch (error) {
        next(error);
    }
}

export async function crearOActualizarProductoCatalogo(req, res, next) {
    try {
        const producto = await guardarProductoCatalogo(req.body);
        res.json({
            mensaje: "Producto guardado en inventario.",
            producto
        });
    } catch (error) {
        next(error);
    }
}

export async function importarCatalogo(req, res, next) {
    try {
        const resultado = await importarProductosCatalogo(req.body.productos || []);
        res.json({
            mensaje: `Importacion completada: ${resultado.creados} productos nuevos y ${resultado.conservados} existentes conservados.${resultado.duplicados ? ` ${resultado.duplicados} filas repetidas agrupadas por PLU.` : ""}`,
            resultado
        });
    } catch (error) {
        next(error);
    }
}

export async function borrarProductoCatalogo(req, res, next) {
    try {
        const producto = await eliminarProductoCatalogo(req.params.plu);
        if (!producto) {
            return res.status(404).json({ mensaje: "Producto no encontrado en inventario." });
        }

        return res.json({ mensaje: "Producto eliminado del inventario." });
    } catch (error) {
        next(error);
    }
}
