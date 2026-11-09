import { Business } from "../models/Business.js";
import { NEGOCIO_PREDETERMINADO, validarNegocio } from "../../src/lib/business.js";

export async function obtenerNegocio() {
    const negocio = await Business.findById("principal").lean();
    return negocio ? { nombre: negocio.nombre, rubro: negocio.rubro, configurado: true } : { ...NEGOCIO_PREDETERMINADO };
}

export async function guardarNegocio(datos, usuario) {
    if (usuario?.rol !== "admin") {
        const error = new Error("Solo un administrador puede editar el negocio.");
        error.status = 403;
        throw error;
    }
    const negocio = validarNegocio(datos);
    const guardado = await Business.findOneAndUpdate(
        { _id: "principal" }, { $set: negocio },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return { nombre: guardado.nombre, rubro: guardado.rubro, configurado: true };
}
