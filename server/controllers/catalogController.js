import {
    eliminarProductoCatalogo,
    guardarProductoCatalogo,
    importarProductosCatalogo,
    listarCatalogo
} from "../services/catalogService.js";

export async function obtenerCatalogo(req, res, next) {
    try {
        res.json({ productos: await listarCatalogo(req.query) });
    } catch (error) {
        next(error);
    }
}

export async function crearOActualizarProductoCatalogo(req, res, next) {
    try {
        const producto = await guardarProductoCatalogo(req.body);
        res.json({
            mensaje: "Producto guardado en catalogo.",
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
            mensaje: `Catalogo actualizado con ${resultado.recibidos} productos.`,
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
            return res.status(404).json({ mensaje: "Producto no encontrado en catalogo." });
        }

        return res.json({ mensaje: "Producto eliminado del catalogo." });
    } catch (error) {
        next(error);
    }
}
