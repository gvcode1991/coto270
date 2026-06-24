const h = React.createElement;

export function DateFilter({ fechas, fechaSeleccionada, onChange }) {
    if (!fechas.length) return null;

    return h(
        "section",
        { className: "date-filter", "aria-label": "Periodo de ventas" },
        h(
            "div",
            { className: "date-filter-copy" },
            h("strong", null, "Periodo de ventas"),
            h("span", null, "Consulta la semana completa o una fecha especifica del reporte.")
        ),
        h(
            "select",
            {
                id: "filtroFecha",
                className: "date-filter-select",
                value: fechaSeleccionada,
                onChange: event => onChange(event.target.value),
                "aria-label": "Elegir fecha de ventas"
            },
            h("option", { value: "semana" }, "Semana completa"),
            fechas.map(fecha =>
                h("option", { key: fecha.clave, value: fecha.clave }, fecha.etiqueta)
            )
        )
    );
}
