import { Router } from "express";
import {
    actividadGlobal,
    cambiarActivo,
    cambiarEstado,
    cambiarRol,
    usuarios
} from "../controllers/adminController.js";
import { requerirAdmin, requerirUsuario } from "../middleware/auth.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";

export const adminRoutes = Router();

adminRoutes.use(requerirBaseDeDatos, requerirUsuario, requerirAdmin);
adminRoutes.get("/users", usuarios);
adminRoutes.patch("/users/:id/status", cambiarEstado);
adminRoutes.patch("/users/:id/role", cambiarRol);
adminRoutes.patch("/users/:id/access", cambiarActivo);
adminRoutes.get("/activity", actividadGlobal);
