import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { obtenerEstadoBaseDeDatos } from "./config/database.js";
import { manejarErrores } from "./middleware/errorHandler.js";
import { balanceRoutes } from "./routes/balanceRoutes.js";
import { reportRoutes } from "./routes/reportRoutes.js";

const directorioActual = path.dirname(fileURLToPath(import.meta.url));
const raizProyecto = path.resolve(directorioActual, "..");

export function crearApp({ clientOrigin = "" } = {}) {
    const app = express();

    app.disable("x-powered-by");
    app.use(
        cors({
            origin: clientOrigin
                ? clientOrigin.split(",").map(origen => origen.trim())
                : true
        })
    );
    app.use(express.json({ limit: "25mb" }));

    app.get("/api/health", (req, res) => {
        const baseDeDatos = obtenerEstadoBaseDeDatos();
        res.json({
            servicio: "Pulso de Ventas API",
            version: "5.3.0",
            estado: "activo",
            baseDeDatos
        });
    });

    app.use("/api/reports", reportRoutes);
    app.use("/api/balances", balanceRoutes);
    app.use(express.static(raizProyecto));
    app.get("*splat", (req, res) => {
        res.sendFile(path.join(raizProyecto, "index.html"));
    });
    app.use(manejarErrores);

    return app;
}
