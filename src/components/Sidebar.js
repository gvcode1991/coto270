import { APP_VERSION } from "../constants.js";
import {
    esAdmin,
    puedeAnalizar,
    puedeGestionarBalances,
    puedeVerReportes,
    puedeVerUsuarios
} from "../lib/permissions.js";

const h = React.createElement;

export function Sidebar({ grupos, ruta, usuario, negocio, modoLocal = false, menuAbierto, cerrarMenu, alternarMenu }) {
    const navegar = () => {
        cerrarMenu();
        window.scrollTo({ top: 0, behavior: "smooth" });
        requestAnimationFrame(() => document.getElementById("contenido")?.focus({ preventScroll: true }));
    };

    return h(
        "aside",
        { id: "menuLateral", className: "sidebar", "aria-label": "Menú lateral" },
        h(
            "button",
            {
                id: "menuToggle",
                className: "menu-toggle",
                type: "button",
                "aria-controls": "menuLateral",
                "aria-expanded": String(menuAbierto),
                "aria-label": menuAbierto ? "Cerrar menú" : "Abrir menú",
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
            h("strong", { className: "business-name" }, negocio.nombre)
        ),
        h(
            "nav",
            { className: "sidebar-nav", "aria-label": "Secciones" },
            (usuario || modoLocal) && h(
                MenuLink,
                { href: "#/carga", activo: ruta.vista === "carga", onClick: navegar },
                "Cargar ventas"
            ),
            (puedeAnalizar(usuario) || modoLocal) && h(MenuLink, {
                href: "#/ranking",
                activo: ruta.vista === "ranking",
                onClick: navegar
            }, "Ranking de productos"),
            (puedeAnalizar(usuario) || modoLocal) && h(DepartmentLinks, { grupos, ruta, navegar }),
            (puedeAnalizar(usuario) || modoLocal) && h(
                MenuLink,
                {
                    href: "#/graficos",
                    activo: ruta.vista === "graficos",
                    onClick: navegar
                },
                "Gráficos por departamento"
            ),
            puedeVerReportes(usuario) && h(
                MenuLink,
                { href: "#/reportes", activo: ruta.vista === "reportes", onClick: navegar },
                "Reportes guardados"
            ),
            puedeGestionarBalances(usuario) && h(
                MenuLink,
                { href: "#/balance", activo: ruta.vista === "balance", onClick: navegar },
                "Balance"
            ),
            esAdmin(usuario) && h(
                MenuLink,
                { href: "#/inventario", activo: ruta.vista === "inventario" || ruta.vista === "catalogo", onClick: navegar },
                "Inventario"
            ),
            esAdmin(usuario) && h(MenuLink, { href: "#/negocio", activo: ruta.vista === "negocio", onClick: navegar }, "Tu negocio"),
            h(
                MenuLink,
                { href: "#/cuenta", activo: ruta.vista === "cuenta", onClick: navegar },
                usuario ? "Mi cuenta" : "Iniciar sesión"
            ),
            puedeVerUsuarios(usuario) && h(
                MenuLink,
                { href: "#/admin", activo: ruta.vista === "admin", onClick: navegar },
                usuario.rol === "admin" ? "Administrar usuarios" : "Ver usuarios"
            )
        ),
        h(
            "div",
            { className: "sidebar-meta" },
            h("span", { className: "version-label" }, `Versión ${APP_VERSION}`)
        )
    );
}

function DepartmentLinks({ grupos, ruta, navegar }) {
    return h("details", { className: "sidebar-dropdown", open: ruta.vista === "dto" || undefined },
        h("summary", null, "Ventas por departamento"),
        h("div", { id: "menuDto", className: "sidebar-subnav" },
            !grupos.length && h("p", { className: "field-hint" }, "Cargá un reporte para ver sus departamentos."),
            grupos.map(grupo => h("a", {
                key: grupo.dto,
                className: ruta.vista === "dto" && ruta.dto === String(grupo.dto) ? "active" : "",
                href: `#/dto/${encodeURIComponent(grupo.dto)}`,
                onClick: navegar
            }, grupo.departamento))
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
