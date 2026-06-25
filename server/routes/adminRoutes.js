import { Router } from "express";
import {
    actividadGlobal,
    cambiarActivo,
    cambiarEstado,
    cambiarRol,
    usuarios
} from "../controllers/adminController.js";
import { requerirAdmin, requerirPermiso, requerirUsuario } from "../middleware/auth.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";

export const adminRoutes = Router();

adminRoutes.use(requerirBaseDeDatos, requerirUsuario);
adminRoutes.get("/users", requerirPermiso("usuarios:ver"), usuarios);
adminRoutes.get("/activity", requerirPermiso("usuarios:ver"), actividadGlobal);
adminRoutes.use(requerirAdmin);
adminRoutes.patch("/users/:id/status", cambiarEstado);
adminRoutes.patch("/users/:id/role", cambiarRol);
adminRoutes.patch("/users/:id/access", cambiarActivo);
