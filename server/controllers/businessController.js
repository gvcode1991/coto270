import { baseDeDatosDisponible } from "../config/database.js";
import { obtenerNegocio, guardarNegocio } from "../services/businessService.js";
import { NEGOCIO_PREDETERMINADO } from "../../src/lib/business.js";

export async function leerNegocio(req, res, next) {
    try {
        res.json({ negocio: baseDeDatosDisponible() ? await obtenerNegocio() : { ...NEGOCIO_PREDETERMINADO } });
    } catch (error) { next(error); }
}

export async function actualizarNegocio(req, res, next) {
    try {
        res.json({ negocio: await guardarNegocio(req.body, req.usuario), mensaje: "Los datos de tu negocio se guardaron." });
    } catch (error) { next(error); }
}
