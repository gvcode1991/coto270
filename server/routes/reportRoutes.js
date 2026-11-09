import { Router } from "express";
import {
    crearOActualizarReporte,
    compararReportes,
    obtenerReportePorId,
    obtenerReportes
} from "../controllers/reportController.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";
import { requerirPermiso, requerirUsuario } from "../middleware/auth.js";

export const reportRoutes = Router();

reportRoutes.use(requerirBaseDeDatos);
reportRoutes.use(requerirUsuario);
reportRoutes.get("/", requerirPermiso("reportes:ver"), obtenerReportes);
reportRoutes.get("/compare", requerirPermiso("reportes:ver"), compararReportes);
reportRoutes.get("/:id", requerirPermiso("reportes:ver"), obtenerReportePorId);
reportRoutes.post("/", requerirPermiso("reportes:cargar"), crearOActualizarReporte);
