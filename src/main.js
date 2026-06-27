import { PulsoApp } from "./PulsoApp.js";

const root = document.getElementById("root");
const h = React.createElement;

window.addEventListener("error", event => {
    mostrarError(event.error || event.message);
});

window.addEventListener("unhandledrejection", event => {
    mostrarError(event.reason);
});

class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error) {
        console.error(error);
    }

    render() {
        if (this.state.error) {
            const detalle = this.state.error && this.state.error.message
                ? this.state.error.message
                : "Error desconocido";

            return h(
                "section",
                { className: "empty-view app-error-fallback" },
                h("img", {
                    src: "assets/images/pulso-de-ventas-icon.png",
                    alt: "",
                    "aria-hidden": "true"
                }),
                h("h1", null, "No se pudo abrir Pulso de Ventas"),
                h("p", null, `Detalle: ${detalle}`)
            );
        }

        return this.props.children;
    }
}

try {
    ReactDOM.createRoot(root).render(h(AppErrorBoundary, null, h(PulsoApp)));
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
