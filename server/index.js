import "dotenv/config";
import { crearApp } from "./app.js";
import { conectarBaseDeDatos } from "./config/database.js";

const puerto = Number(process.env.PORT) || 3000;

try {
    await conectarBaseDeDatos(
        process.env.MONGODB_URI,
        process.env.MONGODB_DB_NAME
    );
} catch (error) {
    console.error("No se pudo conectar a MongoDB:", error.message);
    console.warn("El servidor continuara activo sin persistencia.");
}

const app = crearApp({
    clientOrigin: process.env.CLIENT_ORIGIN
});

app.listen(puerto, "0.0.0.0", () => {
    console.log(`Pulso de Ventas disponible en http://localhost:${puerto}`);
});
