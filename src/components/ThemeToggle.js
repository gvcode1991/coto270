const h = React.createElement;

export function ThemeToggle({ tema, alternarTema }) {
    const oscuro = tema === "dark";
    return h(
        "button",
        {
            id: "themeToggle",
            className: "theme-toggle",
            type: "button",
            "aria-label": oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro",
            "aria-pressed": String(oscuro),
            onClick: alternarTema
        },
        h("span", { className: "theme-toggle-icon", "aria-hidden": "true" }, "o"),
        h("span", { className: "theme-toggle-text" }, oscuro ? "Tema claro" : "Tema oscuro")
    );
}
