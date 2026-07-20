import { Router } from "express";
import {
    borrarProductoCatalogo,
    crearOActualizarProductoCatalogo,
    importarCatalogo,
    obtenerCatalogo
} from "../controllers/catalogController.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";
import { requerirAdmin, requerirUsuario } from "../middleware/auth.js";

export const catalogRoutes = Router();

catalogRoutes.use(requerirBaseDeDatos);
catalogRoutes.use(requerirUsuario);
catalogRoutes.get("/", obtenerCatalogo);
catalogRoutes.use(requerirAdmin);
catalogRoutes.post("/", crearOActualizarProductoCatalogo);
catalogRoutes.post("/import", importarCatalogo);
catalogRoutes.delete("/:plu", borrarProductoCatalogo);
