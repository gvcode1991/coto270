import {
    guardarReporte,
    listarReportes,
    obtenerReporte
} from "../services/reportService.js";
import { compararReportesGuardados } from "../services/reportComparisonService.js";

export async function compararReportes(req, res, next) {
    try {
        res.json({ comparacion: await compararReportesGuardados(req.query.base, req.query.comparado) });
    } catch (error) { next(error); }
}

export async function crearOActualizarReporte(req, res, next) {
    try {
        const resultado = await guardarReporte(req.body, req.usuario);
        res.status(resultado.duplicado ? 200 : 201).json({
            mensaje: resultado.duplicado
                ? "Este reporte ya estaba guardado. Se conservó el original sin duplicarlo."
                : "Reporte guardado correctamente.",
            duplicado: resultado.duplicado,
            reporte: resultado.reporte
        });
    } catch (error) {
        next(error);
    }
}

export async function obtenerReportes(req, res, next) {
    try {
        res.json(await listarReportes(req.query));
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
