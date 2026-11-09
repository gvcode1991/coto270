const RESEND_API_URL = "https://api.resend.com/emails";

export function estaEmailConfigurado() {
    return Boolean(process.env.RESEND_API_KEY && remitente());
}

export async function enviarCodigoRecuperacion({ email, nombre, recoveryCode }) {
    if (!estaEmailConfigurado()) {
        const error = new Error("El envio de correos no esta configurado.");
        error.status = 503;
        throw error;
    }

    const respuesta = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: remitente(),
            to: [email],
            subject: "Codigo de recuperacion - Pulso de Ventas",
            html: crearHtml({ nombre, recoveryCode }),
            text: crearTexto({ nombre, recoveryCode })
        })
    });

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        const error = new Error(datos.message || "No se pudo enviar el correo de recuperacion.");
        error.status = respuesta.status >= 500 ? 502 : 400;
        throw error;
    }

    return datos;
}

function remitente() {
    return process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || "";
}

function crearTexto({ nombre, recoveryCode }) {
    return [
        `Hola ${nombre || ""}`.trim(),
        "",
        "Este es tu codigo de recuperacion de Pulso de Ventas:",
        recoveryCode,
        "",
        "Usalo para cambiar tu contrasena desde la pantalla de recuperacion.",
        "Si no pediste este codigo, ignora este mensaje."
    ].join("\n");
}

function crearHtml({ nombre, recoveryCode }) {
    const nombreSeguro = escaparHtml(nombre || "usuario");
    const codigoSeguro = escaparHtml(recoveryCode);

    return `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
            <h1 style="font-size: 22px;">Pulso de Ventas</h1>
            <p>Hola ${nombreSeguro},</p>
            <p>Este es tu codigo de recuperacion:</p>
            <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px;">${codigoSeguro}</p>
            <p>Usalo para cambiar tu contrasena desde la pantalla de recuperacion.</p>
            <p style="color: #64748b;">Si no pediste este codigo, ignora este mensaje.</p>
        </div>
    `;
}

function escaparHtml(valor) {
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
