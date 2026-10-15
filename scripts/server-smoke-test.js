import { crearApp } from "../server/app.js";

const servidor = crearApp().listen(0, "127.0.0.1");

try {
    await new Promise((resolve, reject) => {
        servidor.once("listening", resolve);
        servidor.once("error", reject);
    });

    const puerto = servidor.address().port;
    const baseUrl = `http://127.0.0.1:${puerto}`;
    const [health, reports, balances, catalog, auth, home] = await Promise.all([
        fetch(`${baseUrl}/api/health`),
        fetch(`${baseUrl}/api/reports`),
        fetch(`${baseUrl}/api/balances`),
        fetch(`${baseUrl}/api/catalog`),
        fetch(`${baseUrl}/api/auth/me`),
        fetch(baseUrl)
    ]);

    const healthBody = await health.json();
    const reportsBody = await reports.json();
    const balancesBody = await balances.json();
    const catalogBody = await catalog.json();
    const authBody = await auth.json();
    const homeBody = await home.text();

    verificar(health.status === 200, "El endpoint de estado no respondio correctamente.");
    verificar(healthBody.estado === "activo", "El servidor no informo estado activo.");
    verificar(reports.status === 503, "El historial debe quedar deshabilitado sin MongoDB.");
    verificar(
        reportsBody.mensaje?.includes("base de datos"),
        "La respuesta sin MongoDB no fue clara."
    );
    verificar(balances.status === 503, "Balance debe quedar protegido sin MongoDB.");
    verificar(
        balancesBody.mensaje?.includes("base de datos"),
        "Balance no informo correctamente la falta de MongoDB."
    );
    verificar(catalog.status === 503, "Catalogo debe quedar protegido sin MongoDB.");
    verificar(
        catalogBody.mensaje?.includes("base de datos"),
        "Catalogo no informo correctamente la falta de MongoDB."
    );
    verificar(auth.status === 503, "Usuarios debe quedar protegido sin MongoDB.");
    verificar(
        authBody.mensaje?.includes("base de datos"),
        "Usuarios no informo correctamente la falta de MongoDB."
    );
    verificar(home.status === 200, "La aplicacion web no fue servida.");
    verificar(homeBody.includes('id="root"'), "No se encontro la aplicacion React.");
    verificar(homeBody.includes("v=5.20.1"), "No se encontro la version 5.20.1.");

    const recursosPublicos = [
        ["/index.html", "text/html"],
        ["/src/main.js", "javascript"],
        ["/src/components/BalancePage.js", "javascript"],
        ["/src/lib/balanceProducts.js", "javascript"],
        ["/src/lib/balanceQuantities.js", "javascript"],
        ["/src/lib/roles.js", "javascript"],
        ["/src/styles.css", "text/css"],
        ["/assets/images/pulso-de-ventas-icon.png", "image/png"],
        ["/vendor/react.production.min.js", "javascript"],
        ["/vendor/react-dom.production.min.js", "javascript"],
        ["/vendor/xlsx.full.min.js", "javascript"]
    ];
    await Promise.all(recursosPublicos.map(async ([ruta, tipo]) => {
        const respuesta = await fetch(`${baseUrl}${ruta}`);
        verificar(respuesta.status === 200, `No se pudo cargar ${ruta}.`);
        verificar(respuesta.headers.get("content-type")?.includes(tipo), `Tipo de contenido incorrecto para ${ruta}.`);
        verificar((await respuesta.arrayBuffer()).byteLength > 0, `Recurso vacio: ${ruta}.`);
    }));

    const rutasPrivadasOInexistentes = [
        "/server/app.js",
        "/server/services/authService.js",
        "/scripts/server-smoke-test.js",
        "/package.json",
        "/pnpm-lock.yaml",
        "/render.yaml",
        "/README.md",
        "/.env",
        "/.git/config",
        "/node_modules/express/package.json",
        "/vendor/express/package.json",
        "/src/%2e%2e%2fserver/app.js",
        "/assets/%2e%2e%2fpackage.json",
        "/src/",
        "/assets/",
        "/src/no-existe.js",
        "/api/no-existe",
        "/ruta-no-existe"
    ];
    await Promise.all(rutasPrivadasOInexistentes.map(async ruta => {
        const respuesta = await fetch(`${baseUrl}${ruta}`);
        verificar(respuesta.status === 404, `La ruta ${ruta} debe devolver 404.`);
        verificar(!(await respuesta.text()).includes('id="root"'), `La ruta ${ruta} devolvio el inicio.`);
    }));

    const cabecera = await fetch(baseUrl, { method: "HEAD" });
    verificar(cabecera.status === 200, "El inicio debe admitir HEAD.");
    const postInicio = await fetch(baseUrl, { method: "POST" });
    verificar(postInicio.status === 404, "El inicio no debe aceptar POST.");

    console.log("Servidor, API, recursos publicos y bloqueo de archivos internos verificados.");
} finally {
    await new Promise(resolve => servidor.close(resolve));
}

function verificar(condicion, mensaje) {
    if (!condicion) throw new Error(mensaje);
}
