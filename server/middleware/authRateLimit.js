const intentos = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 10;

export function limitarIntentosAuth(req, res, next) {
    const clave = req.ip || req.socket.remoteAddress || "desconocido";
    const ahora = Date.now();
    const registro = intentos.get(clave);

    if (!registro || ahora > registro.reinicio) {
        intentos.set(clave, { cantidad: 1, reinicio: ahora + VENTANA_MS });
        limpiarRegistros(ahora);
        return next();
    }

    registro.cantidad += 1;
    if (registro.cantidad <= MAX_INTENTOS) return next();

    res.setHeader("Retry-After", Math.ceil((registro.reinicio - ahora) / 1000));
    return res.status(429).json({
        mensaje: "Demasiados intentos. Espere unos minutos antes de volver a probar."
    });
}

function limpiarRegistros(ahora) {
    if (intentos.size < 500) return;
    for (const [clave, registro] of intentos) {
        if (ahora > registro.reinicio) intentos.delete(clave);
    }
}
