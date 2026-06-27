import { crearApp } from "../server/app.js";

const servidor = crearApp().listen(0, "127.0.0.1");

try {
    await new Promise((resolve, reject) => {
        servidor.once("listening", resolve);
        servidor.once("error", reject);
    });

    const puerto = servidor.address().port;
    const baseUrl = `http://127.0.0.1:${puerto}`;
    const [health, reports, balances, auth, home] = await Promise.all([
        fetch(`${baseUrl}/api/health`),
        fetch(`${baseUrl}/api/reports`),
        fetch(`${baseUrl}/api/balances`),
        fetch(`${baseUrl}/api/auth/me`),
        fetch(baseUrl)
    ]);

    const healthBody = await health.json();
    const reportsBody = await reports.json();
    const balancesBody = await balances.json();
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
    verificar(auth.status === 503, "Usuarios debe quedar protegido sin MongoDB.");
    verificar(
        authBody.mensaje?.includes("base de datos"),
        "Usuarios no informo correctamente la falta de MongoDB."
    );
    verificar(home.status === 200, "La aplicacion web no fue servida.");
    verificar(homeBody.includes('id="root"'), "No se encontro la aplicacion React.");
    verificar(homeBody.includes("v=5.7.4"), "No se encontro la version 5.7.4.");

    console.log("Servidor, API y modo local verificados.");
} finally {
    await new Promise(resolve => servidor.close(resolve));
}

function verificar(condicion, mensaje) {
    if (!condicion) throw new Error(mensaje);
}
