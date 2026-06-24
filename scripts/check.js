import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const carpetas = ["src", "server"];
let huboErrores = false;

for (const carpeta of carpetas) {
    for (const archivo of await obtenerJavascript(carpeta)) {
        const resultado = spawnSync(process.execPath, ["--check", archivo], {
            stdio: "inherit"
        });
        if (resultado.status !== 0) huboErrores = true;
    }
}

if (huboErrores) process.exit(1);
console.log("Verificacion completada.");

async function obtenerJavascript(carpeta) {
    const archivos = [];
    const entradas = await readdir(carpeta, { withFileTypes: true });

    for (const entrada of entradas) {
        const ruta = path.join(carpeta, entrada.name);
        if (entrada.isDirectory()) archivos.push(...await obtenerJavascript(ruta));
        if (entrada.isFile() && entrada.name.endsWith(".js")) archivos.push(ruta);
    }

    return archivos;
}
