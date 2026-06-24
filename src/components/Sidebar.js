import { APP_VERSION } from "../constants.js";

const h = React.createElement;

export function Sidebar({ grupos, ruta, usuario, menuAbierto, cerrarMenu, alternarMenu }) {
    const navegar = () => {
        cerrarMenu();
        window.scrollTo({ top: 0, behavior: "smooth" });
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
            h(
                "a",
                {
                    className: "sidebar-brand-link",
                    href: "#/cuenta",
                    "aria-label": "Ir al inicio",
                    onClick: navegar
                },
                h("img", {
                    className: "sidebar-brand-logo",
                    src: "assets/images/pulso-de-ventas-logo.png",
                    alt: "Pulso de Ventas"
                })
            ),
            h("strong", null, "Elaborados")
        ),
        h(
            "nav",
            { className: "sidebar-nav", "aria-label": "Secciones" },
            h(MenuLink, { href: "#/carga", activo: ruta.vista === "carga", onClick: navegar }, "Cargar archivo"),
            h(MenuLink, { href: "#/ranking", activo: ruta.vista === "ranking", onClick: navegar }, "Ranking"),
            h(
                MenuLink,
                {
                    href: "#/graficos",
                    activo: ruta.vista === "graficos",
                    onClick: navegar
                },
                "Graficos por departamento"
            ),
            h(MenuLink, { href: "#/balance", activo: ruta.vista === "balance", onClick: navegar }, "Balance"),
            h(
                MenuLink,
                { href: "#/cuenta", activo: ruta.vista === "cuenta", onClick: navegar },
                usuario ? usuario.nombre : "Iniciar sesion"
            ),
            h(
                "details",
                { className: "sidebar-dropdown", open: ruta.vista === "dto" || undefined },
                h("summary", null, "Ranking por DTO"),
                h(
                    "div",
                    { id: "menuDto", className: "sidebar-subnav" },
                    grupos.map(grupo =>
                        h(
                            "a",
                            {
                                key: grupo.dto,
                                className: ruta.vista === "dto" && ruta.dto === String(grupo.dto) ? "active" : "",
                                href: `#/dto/${encodeURIComponent(grupo.dto)}`,
                                onClick: navegar
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

function MenuLink({ href, activo, onClick, children }) {
    return h(
        "a",
        {
            href,
            className: activo ? "active" : "",
            "aria-current": activo ? "page" : undefined,
            onClick
        },
        children
    );
}
