import express from "express";
import { crearApp } from "../server/app.js";

// No carga .env ni conecta a MongoDB: las pruebas interceptan las respuestas de API.
const servidor = express();
servidor.use("/coto270", express.static("dist"));
servidor.use(crearApp());
servidor.listen(4185, "127.0.0.1");
