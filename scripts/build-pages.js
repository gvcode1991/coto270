import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../", import.meta.url));
const destino = path.join(raiz, "dist");
await rm(destino, { recursive: true, force: true });
await mkdir(path.join(destino, "vendor"), { recursive: true });
for (const carpeta of ["src", "assets"]) {
    await cp(path.join(raiz, carpeta), path.join(destino, carpeta), { recursive: true });
}
for (const [origen, nombre] of [
    ["react/umd/react.production.min.js", "react.production.min.js"],
    ["react-dom/umd/react-dom.production.min.js", "react-dom.production.min.js"],
    ["xlsx/dist/xlsx.full.min.js", "xlsx.full.min.js"]
]) {
    await cp(path.join(raiz, "node_modules", origen), path.join(destino, "vendor", nombre));
}
await cp(path.join(raiz, "index.html"), path.join(destino, "index.html"));
await writeFile(path.join(destino, ".nojekyll"), "");
const paquete = JSON.parse(await readFile(path.join(raiz, "package.json"), "utf8"));
console.log(`Sitio estatico ${paquete.version} preparado en dist.`);
