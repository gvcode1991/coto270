import { formatoKg, formatoMoneda, formatoNumero } from "../lib/formatters.js";
import { calcularTotalesUniKg } from "../lib/products.js";

const { useMemo, useState } = React;
const h = React.createElement;

const METRICAS = {
    venta: {
        etiqueta: "Venta total",
        obtenerValor: grupo => grupo.ventaTotal,
        formatear: valor => formatoMoneda.format(valor)
    },
    uni: {
        etiqueta: "Unidades vendidas",
        obtenerValor: grupo => calcularTotalesUniKg(grupo.productos).uni.uniKg,
        formatear: valor => formatoNumero.format(valor)
    },
    kg: {
        etiqueta: "Kilos vendidos",
        obtenerValor: grupo => calcularTotalesUniKg(grupo.productos).kg.uniKg,
        formatear: valor => `${formatoKg.format(valor)} kg`
    }
};

export function DepartmentCharts({ grupos }) {
    const [metrica, setMetrica] = useState("venta");
    const configuracion = METRICAS[metrica];

    const datos = useMemo(
        () =>
            grupos
                .map(grupo => ({
                    id: grupo.dto,
                    departamento: grupo.departamento,
                    valor: configuracion.obtenerValor(grupo)
                }))
                .filter(item => item.valor > 0)
                .sort((a, b) => b.valor - a.valor),
        [configuracion, grupos]
    );

    const valorMaximo = Math.max(...datos.map(item => item.valor), 0);

    return h(
        "section",
        { id: "graficosDepartamentos", className: `department-charts chart-${metrica}`, "aria-live": "polite" },
        h(
            "div",
            { className: "chart-heading" },
            h(
                "div",
                null,
                h("h2", null, "Graficos por departamento"),
                h("p", null, "Comparacion de resultados entre los departamentos del periodo seleccionado.")
            ),
            h(
                "label",
                { className: "chart-metric-control" },
                h("span", null, "Mostrar"),
                h(
                    "select",
                    {
                        value: metrica,
                        onChange: event => setMetrica(event.target.value),
                        "aria-label": "Metrica del grafico"
                    },
                    Object.entries(METRICAS).map(([valor, opcion]) =>
                        h("option", { key: valor, value: valor }, opcion.etiqueta)
                    )
                )
            )
        ),
        datos.length > 0
            ? h(
                  "div",
                  { className: "department-bar-chart", role: "list", "aria-label": configuracion.etiqueta },
                  datos.map(item =>
                      h(
                          "div",
                          { key: item.id, className: "department-bar-row", role: "listitem" },
                          h(
                              "div",
                              { className: "department-bar-label" },
                              h("strong", null, item.departamento),
                              h("span", null, configuracion.formatear(item.valor))
                          ),
                          h(
                              "div",
                              {
                                  className: "department-bar-track",
                                  role: "img",
                                  "aria-label": `${item.departamento}: ${configuracion.formatear(item.valor)}`
                              },
                              h("span", {
                                  className: "department-bar-fill",
                                  style: { width: `${(item.valor / valorMaximo) * 100}%` }
                              })
                          )
                      )
                  )
              )
            : h("p", { className: "chart-empty" }, `No hay datos de ${configuracion.etiqueta.toLowerCase()} para mostrar.`)
    );
}
