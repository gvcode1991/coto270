import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { obtenerEstadoBaseDeDatos } from "./config/database.js";
import { cargarUsuario } from "./middleware/auth.js";
import { manejarErrores } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/authRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { balanceRoutes } from "./routes/balanceRoutes.js";
import { catalogRoutes } from "./routes/catalogRoutes.js";
import { reportRoutes } from "./routes/reportRoutes.js";
import { businessRoutes } from "./routes/businessRoutes.js";

const directorioActual = path.dirname(fileURLToPath(import.meta.url));
const raizProyecto = path.resolve(directorioActual, "..");
const modulosProyecto = path.join(raizProyecto, "node_modules");

export function crearApp({ clientOrigin = "" } = {}) {
    const app = express();

    app.disable("x-powered-by");
    app.set("trust proxy", 1);
    if (clientOrigin) {
        app.use(
            cors({
                origin: clientOrigin.split(",").map(origen => origen.trim()),
                credentials: true
            })
        );
    }
    app.use(express.json({ limit: "25mb" }));
    app.use(cargarUsuario);

    app.get("/api/health", (req, res) => {
        const baseDeDatos = obtenerEstadoBaseDeDatos();
        res.json({
            servicio: "Pulso de Ventas API",
            version: "5.23.0",
            estado: "activo",
            baseDeDatos
        });
    });

    app.get("/vendor/react.production.min.js", (req, res, next) => {
        res.sendFile(path.join(modulosProyecto, "react", "umd", "react.production.min.js"), error => {
            if (error) next(error);
        });
    });
    app.get("/vendor/react-dom.production.min.js", (req, res, next) => {
        res.sendFile(path.join(modulosProyecto, "react-dom", "umd", "react-dom.production.min.js"), error => {
            if (error) next(error);
        });
    });
    app.get("/vendor/xlsx.full.min.js", (req, res, next) => {
        res.sendFile(path.join(modulosProyecto, "xlsx", "dist", "xlsx.full.min.js"), error => {
            if (error) next(error);
        });
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/reports", reportRoutes);
    app.use("/api/balances", balanceRoutes);
    app.use("/api/catalog", catalogRoutes);
    app.use("/api/business", businessRoutes);
    const opcionesEstaticas = { dotfiles: "deny", index: false, redirect: false };
    app.use("/src", express.static(path.join(raizProyecto, "src"), opcionesEstaticas));
    app.use("/assets", express.static(path.join(raizProyecto, "assets"), opcionesEstaticas));
    app.get(["/", "/index.html"], (req, res, next) => {
        res.sendFile(path.join(raizProyecto, "index.html"), error => {
            if (error) next(error);
        });
    });
    app.use((req, res) => {
        res.status(404).json({ mensaje: "Recurso no encontrado." });
    });
    app.use(manejarErrores);

    return app;
}
