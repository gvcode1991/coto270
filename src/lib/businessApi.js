import { solicitar } from "./authApi.js";

export function obtenerNegocio() {
    return solicitar("/business");
}

export function guardarNegocio(negocio) {
    return solicitar("/business", { method: "PUT", body: JSON.stringify(negocio) });
}
