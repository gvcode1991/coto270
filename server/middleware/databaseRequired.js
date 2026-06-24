import { baseDeDatosDisponible } from "../config/database.js";

export function requerirBaseDeDatos(req, res, next) {
    if (baseDeDatosDisponible()) return next();

    return res.status(503).json({
        mensaje: "La base de datos no esta disponible. El analisis local sigue funcionando."
    });
}
