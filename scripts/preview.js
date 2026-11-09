import { crearApp } from "../server/app.js";

// Vista local real, sin leer .env, conectar MongoDB ni ejecutar migraciones.
const puerto = Number(process.env.PREVIEW_PORT) || 4177;
crearApp().listen(puerto, "127.0.0.1", () => {
    console.log(`Vista local sin persistencia: http://127.0.0.1:${puerto}/#/carga`);
});
