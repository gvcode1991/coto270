import { Router } from "express";
import {
    borrarProductoCatalogo,
    crearOActualizarProductoCatalogo,
    importarCatalogo,
    obtenerCatalogo
} from "../controllers/catalogController.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";
import { requerirPermiso, requerirUsuario } from "../middleware/auth.js";

export const catalogRoutes = Router();

catalogRoutes.use(requerirBaseDeDatos);
catalogRoutes.use(requerirUsuario);
catalogRoutes.get("/", obtenerCatalogo);
catalogRoutes.use(requerirPermiso("productos:editar"));
catalogRoutes.post("/", crearOActualizarProductoCatalogo);
catalogRoutes.post("/import", importarCatalogo);
catalogRoutes.delete("/:plu", borrarProductoCatalogo);
