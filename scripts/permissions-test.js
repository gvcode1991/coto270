import assert from "node:assert/strict";
import { test } from "node:test";
import { ROLES, tienePermiso } from "../server/config/permissions.js";
import { esAdmin, puedeAnalizar, puedeGestionarBalances, puedeGuardarReportes, puedeVerReportes, puedeVerUsuarios } from "../src/lib/permissions.js";

test("la interfaz y el servidor usan la misma matriz de permisos", () => {
    for (const rol of [...ROLES, "desconocido"]) {
        const usuario = { rol };
        for (const [permiso, comprobar] of [
            ["analisis:ver", puedeAnalizar], ["balances:gestionar", puedeGestionarBalances],
            ["reportes:cargar", puedeGuardarReportes], ["reportes:ver", puedeVerReportes],
            ["usuarios:ver", puedeVerUsuarios], ["productos:editar", esAdmin]
        ]) assert.equal(comprobar(usuario), tienePermiso(usuario, permiso), `${rol}: ${permiso}`);
    }
});

test("solo admin edita productos y el operador no accede al analisis", () => {
    assert.equal(tienePermiso({ rol: "referente" }, "productos:editar"), false);
    assert.equal(puedeAnalizar({ rol: "operador" }), false);
    assert.equal(puedeAnalizar(null), false);
    assert.equal(puedeGestionarBalances({ rol: "referente" }), true);
    assert.equal(puedeVerReportes({ rol: "gerente" }), true);
});
