import { Router } from "express";
import {
    crearOActualizarReporte,
    obtenerReportePorId,
    obtenerReportes
} from "../controllers/reportController.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";

export const reportRoutes = Router();

reportRoutes.use(requerirBaseDeDatos);
reportRoutes.get("/", obtenerReportes);
reportRoutes.get("/:id", obtenerReportePorId);
reportRoutes.post("/", crearOActualizarReporte);
