import { Router } from "express";
import {
    crearOActualizarReporte,
    obtenerReportePorId,
    obtenerReportes
} from "../controllers/reportController.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";
import { requerirPermiso, requerirUsuario } from "../middleware/auth.js";

export const reportRoutes = Router();

reportRoutes.use(requerirBaseDeDatos);
reportRoutes.use(requerirUsuario);
reportRoutes.get("/", requerirPermiso("reportes:ver"), obtenerReportes);
reportRoutes.get("/:id", requerirPermiso("reportes:ver"), obtenerReportePorId);
reportRoutes.post("/", requerirPermiso("reportes:cargar"), crearOActualizarReporte);
