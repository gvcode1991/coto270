import { APP_VERSION } from "../constants.js";
import { crearIdDto } from "../lib/products.js";

const h = React.createElement;

export function Sidebar({ grupos, menuAbierto, cerrarMenu, alternarMenu }) {
    const navegar = (event, destinoId, centrar = false) => {
        cerrarMenu();
        const destino = document.querySelector(destinoId);

        if (centrar && destino) {
            event.preventDefault();
            destino.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest"
            });
        }
    };

    return h(
        "aside",
        { id: "menuLateral", className: "sidebar", "aria-label": "Menu lateral" },
        h(
            "button",
            {
                id: "menuToggle",
                className: "menu-toggle",
                type: "button",
                "aria-controls": "menuLateral",
                "aria-expanded": String(menuAbierto),
                "aria-label": menuAbierto ? "Cerrar menu" : "Abrir menu",
                onClick: alternarMenu
            },
            h("img", {
                src: "assets/images/pulso-de-ventas-icon.png",
                alt: "",
                "aria-hidden": "true"
            }),
            h("span", { className: "menu-toggle-symbol", "aria-hidden": "true" }, menuAbierto ? "-" : "+")
        ),
        h(
            "div",
            { className: "sidebar-header" },
            h("img", {
                className: "sidebar-brand-logo",
                src: "assets/images/pulso-de-ventas-logo.png",
                alt: "Pulso de Ventas"
            }),
            h("strong", null, "Elaborados")
        ),
        h(
            "nav",
            { className: "sidebar-nav", "aria-label": "Secciones" },
            h("a", { className: "active", href: "#carga", onClick: event => navegar(event, "#carga") }, "Cargar archivo"),
            h("a", { href: "#resultado", onClick: event => navegar(event, "#resultado") }, "Ranking"),
            h(
                "details",
                { className: "sidebar-dropdown" },
                h("summary", null, "Ranking por DTO"),
                h(
                    "div",
                    { id: "menuDto", className: "sidebar-subnav" },
                    grupos.map(grupo =>
                        h(
                            "a",
                            {
                                key: grupo.dto,
                                href: `#${crearIdDto(grupo)}`,
                                onClick: event => navegar(event, `#${crearIdDto(grupo)}`, true)
                            },
                            grupo.departamento
                        )
                    )
                )
            )
        ),
        h(
            "div",
            { className: "sidebar-meta" },
            h("span", { className: "version-label" }, `Version ${APP_VERSION}`)
        )
    );
}
