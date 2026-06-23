import { formatoMoneda, formatearUniKgPorTipo } from "../lib/formatters.js";
import { calcularTotalesUniKg } from "../lib/products.js";

const h = React.createElement;

export function SummaryTable({ productos }) {
    const totales = calcularTotalesUniKg(productos);
    const filas = [
        ["Unidades vendidas", "uni", totales.uni],
        ["Productos por kg vendidos", "kg", totales.kg]
    ];

    return h(
        "table",
        { className: "summary-table" },
        h("thead", null, h("tr", null, ["Tipo", "Total", "Venta"].map(columna => h("th", { key: columna }, columna)))),
        h(
            "tbody",
            null,
            filas.map(([texto, tipo, total]) =>
                h(
                    "tr",
                    { key: texto },
                    h("td", null, texto),
                    h("td", null, formatearUniKgPorTipo(tipo, total.uniKg)),
                    h("td", null, formatoMoneda.format(total.ventaTotal))
                )
            )
        )
    );
}
