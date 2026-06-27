import { PulsoApp } from "./PulsoApp.js";

const root = document.getElementById("root");

window.addEventListener("error", event => {
    mostrarError(event.error || event.message);
});

window.addEventListener("unhandledrejection", event => {
    mostrarError(event.reason);
});

try {
    ReactDOM.createRoot(root).render(React.createElement(PulsoApp));
} catch (error) {
    mostrarError(error);
}

function mostrarError(error) {
    if (!root || root.dataset.fallbackShown === "true") return;
    root.dataset.fallbackShown = "true";
    const detalle = error && error.message ? error.message : String(error || "Error desconocido");
    root.innerHTML = `
        <section class="empty-view app-error-fallback">
            <img src="assets/images/pulso-de-ventas-icon.png" alt="" aria-hidden="true" />
            <h1>No se pudo abrir Pulso de Ventas</h1>
            <p>Actualice la pagina. Si el problema sigue, envie este detalle: ${escaparHtml(detalle)}</p>
        </section>
    `;
}

function escaparHtml(valor) {
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
