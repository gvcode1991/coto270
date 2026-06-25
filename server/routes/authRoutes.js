import { Router } from "express";
import {
    actividad,
    eliminarOtrasSesiones,
    eliminarSesion,
    login,
    logout,
    nuevoRecoveryCode,
    perfil,
    recuperar,
    registrar,
    sesiones
} from "../controllers/authController.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";
import { requerirUsuario } from "../middleware/auth.js";
import { limitarIntentosAuth } from "../middleware/authRateLimit.js";

export const authRoutes = Router();

authRoutes.use(requerirBaseDeDatos);
authRoutes.post("/register", limitarIntentosAuth, registrar);
authRoutes.post("/login", limitarIntentosAuth, login);
authRoutes.post("/recover", limitarIntentosAuth, recuperar);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requerirUsuario, perfil);
authRoutes.get("/sessions", requerirUsuario, sesiones);
authRoutes.delete("/sessions", requerirUsuario, eliminarOtrasSesiones);
authRoutes.delete("/sessions/:id", requerirUsuario, eliminarSesion);
authRoutes.post("/recovery-code", requerirUsuario, nuevoRecoveryCode);
authRoutes.get("/activity", requerirUsuario, actividad);
