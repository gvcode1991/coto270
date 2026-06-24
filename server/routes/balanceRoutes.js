import { Router } from "express";
import {
    borrarBalance,
    crearOActualizarBalance,
    obtenerBalances
} from "../controllers/balanceController.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";

export const balanceRoutes = Router();

balanceRoutes.use(requerirBaseDeDatos);
balanceRoutes.get("/", obtenerBalances);
balanceRoutes.post("/", crearOActualizarBalance);
balanceRoutes.delete("/:id", borrarBalance);
