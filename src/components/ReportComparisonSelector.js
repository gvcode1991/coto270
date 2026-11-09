const h = React.createElement;

export function ReportComparisonSelector({ seleccion, cambiar, comparar, cargando, bloqueado, error }) {
    return h("section", { className: "comparison-selector", "aria-label": "Selección de semanas" },
        h("h2", null, "Comparar semanas"),
        h("div", { className: "comparison-selection" },
            [["base", "Semana base"], ["comparado", "Semana a comparar"]].map(([clave, titulo]) =>
                h("div", { key: clave },
                    h("strong", null, titulo),
                    h("span", null, seleccion[clave]?.nombreArchivo || "Sin seleccionar"),
                    seleccion[clave] && h("small", null, periodo(seleccion[clave].periodo)),
                    seleccion[clave] && h("button", {
                        type: "button", className: "secondary-button", disabled: cargando,
                        "aria-label": `Quitar ${titulo.toLowerCase()}`, onClick: () => cambiar(clave, null)
                    }, "Quitar")
                )
            )
        ),
        h("button", {
            type: "button", className: "compare-reports-button", onClick: comparar,
            disabled: cargando || bloqueado || !seleccion.base || !seleccion.comparado || seleccion.base._id === seleccion.comparado._id
        }, cargando ? "Comparando…" : "Comparar reportes"),
        cargando && h("p", { role: "status" }, "Calculando las variaciones…"),
        error && h("p", { className: "auth-message error", role: "alert" }, error)
    );
}

function periodo(datos = {}) { return datos.inicio ? `${datos.inicio} al ${datos.fin}` : "Período sin fecha"; }
