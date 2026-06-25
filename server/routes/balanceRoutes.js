import { Router } from "express";
import {
    borrarBalance,
    crearOActualizarBalance,
    obtenerBalances
} from "../controllers/balanceController.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";
import { requerirPermiso, requerirUsuario } from "../middleware/auth.js";

export const balanceRoutes = Router();

balanceRoutes.use(requerirBaseDeDatos);
balanceRoutes.use(requerirUsuario);
balanceRoutes.use(requerirPermiso("balances:gestionar"));
balanceRoutes.get("/", obtenerBalances);
balanceRoutes.post("/", crearOActualizarBalance);
balanceRoutes.delete("/:id", borrarBalance);
