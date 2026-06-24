import { Router } from "express";
import {
    login,
    logout,
    perfil,
    registrar
} from "../controllers/authController.js";
import { requerirBaseDeDatos } from "../middleware/databaseRequired.js";
import { requerirUsuario } from "../middleware/auth.js";
import { limitarIntentosAuth } from "../middleware/authRateLimit.js";

export const authRoutes = Router();

authRoutes.use(requerirBaseDeDatos);
authRoutes.post("/register", limitarIntentosAuth, registrar);
authRoutes.post("/login", limitarIntentosAuth, login);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requerirUsuario, perfil);
