import {
    guardarReporte,
    listarReportes,
    obtenerReporte
} from "../services/reportService.js";

export async function crearOActualizarReporte(req, res, next) {
    try {
        const resultado = await guardarReporte(req.body);
        res.status(resultado.actualizado ? 200 : 201).json({
            mensaje: resultado.actualizado
                ? "Reporte actualizado correctamente."
                : "Reporte guardado correctamente.",
            reporte: resultado.reporte
        });
    } catch (error) {
        next(error);
    }
}

export async function obtenerReportes(req, res, next) {
    try {
        res.json({ reportes: await listarReportes() });
    } catch (error) {
        next(error);
    }
}

export async function obtenerReportePorId(req, res, next) {
    try {
        const reporte = await obtenerReporte(req.params.id);

        if (!reporte) {
            return res.status(404).json({ mensaje: "Reporte no encontrado." });
        }

        return res.json({ reporte });
    } catch (error) {
        return next(error);
    }
}
