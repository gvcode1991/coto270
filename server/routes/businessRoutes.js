import { Router } from "express";
import { requerirAdmin, requerirUsuario } from "../middleware/auth.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";
import { leerNegocio, actualizarNegocio } from "../controllers/businessController.js";

export const businessRoutes = Router();

// El nombre y rubro son identidad publica; la escritura requiere sesion y rol admin.
businessRoutes.get("/", leerNegocio);
businessRoutes.put("/", requerirBaseDeDatos, requerirUsuario, requerirAdmin, actualizarNegocio);
