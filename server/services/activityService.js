import { Activity } from "../models/Activity.js";

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
