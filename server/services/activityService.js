import { Activity } from "../models/Activity.js";
import { paginar } from "../lib/pagination.js";

export async function registrarActividad({
    usuario = null,
    tipo,
    detalle = "",
    contexto = {}
}) {
    try {
        await Activity.create({
            usuario: usuario?._id || usuario || null,
            tipo,
            detalle,
            ip: contexto.ip || "",
            userAgent: contexto.userAgent || ""
        });
    } catch (error) {
        console.error("No se pudo registrar la actividad:", error.message);
    }
}

export async function listarActividad({ usuarioId, esAdmin = false, limite = 50 }) {
    const filtro = esAdmin ? {} : { usuario: usuarioId };
    return Activity.find(filtro)
        .sort({ createdAt: -1 })
        .limit(Math.min(Number(limite) || 50, 100))
        .populate("usuario", "nombre email")
        .lean();
}

export async function listarActividadGlobal(parametros = {}) {
    const { registros, paginacion } = await paginar(Activity, {}, parametros, {
        orden: { createdAt: -1, _id: -1 },
        popular: { path: "usuario", select: "nombre email" }
    });
    return { actividad: registros, paginacion };
}

export async function limpiarActividadGlobal(administrador) {
    if (administrador?.rol !== "admin") {
        const error = new Error("Solo un administrador puede limpiar los registros.");
        error.status = 403;
        throw error;
    }
    const resultado = await Activity.deleteMany({});
    return { eliminados: resultado.deletedCount || 0 };
}
