import { Pagination } from "./Pagination.js";

const { useMemo, useState } = React;
const h = React.createElement;
const POR_PAGINA = 15;
const ESTADOS = { ambos: "Ambas semanas", "solo-base": "Solo en la base", "solo-comparado": "Solo en la comparada" };
const METRICAS = [["unidades", "Unidades"], ["kilogramos", "Kilogramos"], ["venta", "Venta en pesos"]];
const numero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const moneda = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export function ReportComparisonPage({ comparacion, volver }) {
    const [vista, setVista] = useState("departamentos");
    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("");
    const [pagina, setPagina] = useState(1);
    const productos = useMemo(() => {
        const texto = busqueda.trim().toLocaleLowerCase("es");
        return comparacion.productos.filter(producto => (!estado || producto.estado === estado) &&
            `${producto.plu} ${producto.nombre} ${producto.nombreBase}`.toLocaleLowerCase("es").includes(texto));
    }, [comparacion, busqueda, estado]);
    const paginas = Math.max(1, Math.ceil(productos.length / POR_PAGINA));
    const actual = Math.min(pagina, paginas);
    const grupos = vista === "departamentos"
        ? comparacion.departamentos.map(item => ({ ...item, id: item.clave, titulo: `${item.codigo ? `${item.codigo} · ` : ""}${item.nombre}` }))
        : productos.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA).map(item => ({ ...item, id: item.plu, titulo: `${item.plu} · ${item.nombre}`, estadoTexto: ESTADOS[item.estado] }));

    return h("section", { className: "reports-page comparison-page" },
        h("div", { className: "page-heading" },
            h("div", null, h("p", { className: "page-eyebrow" }, "Reportes guardados"), h("h1", null, "Comparación de semanas")),
            h("button", { type: "button", className: "secondary-button", onClick: volver }, "Volver a reportes")
        ),
        h("dl", { className: "comparison-periods" },
            [["Semana base", comparacion.base], ["Semana comparada", comparacion.comparado]].map(([titulo, reporte]) =>
                h("div", { key: titulo }, h("dt", null, titulo), h("dd", null, reporte.nombreArchivo),
                    h("dd", null, `${reporte.periodo.inicio} al ${reporte.periodo.fin} · ${reporte.dias} días`)))
        ),
        comparacion.advertencias.length > 0 && h("section", { className: "comparison-warnings", "aria-label": "Advertencias de comparación" },
            h("h2", null, "Advertencias"), h("ul", null, comparacion.advertencias.map(texto => h("li", { key: texto }, texto)))) ,
        h("h2", null, "Total general"),
        h(MetricTable, { grupos: [{ id: "general", ...comparacion.general }], etiqueta: "Comparación general" }),
        h("div", { className: "comparison-tabs", role: "group", "aria-label": "Detalle de comparación" },
            [["departamentos", "Departamentos"], ["productos", "Productos"]].map(([valor, texto]) => h("button", {
                type: "button", key: valor, "aria-pressed": vista === valor, className: vista === valor ? "active" : "",
                onClick: () => setVista(valor)
            }, texto))
        ),
        h("h2", null, vista === "departamentos" ? "Variación por departamento" : "Variación por producto"),
        vista === "productos" && h("div", { className: "table-controls" },
            h("input", { type: "search", className: "table-filter", "aria-label": "Buscar producto comparado", placeholder: "Buscar por PLU o producto", value: busqueda, onChange: e => { setBusqueda(e.target.value); setPagina(1); } }),
            h("select", { className: "table-unit-filter", "aria-label": "Presencia del producto", value: estado, onChange: e => { setEstado(e.target.value); setPagina(1); } },
                h("option", { value: "" }, "Todos"), Object.entries(ESTADOS).map(([valor, texto]) => h("option", { key: valor, value: valor }, texto)))
        ),
        grupos.length ? h(MetricTable, { grupos, etiqueta: vista === "departamentos" ? "Comparación por departamento" : "Comparación por producto" }) : h("p", null, "No hay productos que coincidan con la búsqueda."),
        vista === "productos" && h(Pagination, { totalPaginas: paginas, paginaActual: actual, cambiarPagina: setPagina })
    );
}

function MetricTable({ grupos, etiqueta }) {
    return h("div", { className: "report-detail-table comparison-table", tabIndex: 0, role: "region", "aria-label": etiqueta },
        h("table", null,
            h("thead", null, h("tr", null, ["Concepto", "Base", "Comparada", "Diferencia", "Variación"].map(titulo => h("th", { scope: "col", key: titulo }, titulo)))),
            grupos.map(grupo => h("tbody", { key: grupo.id },
                grupo.titulo && h("tr", { className: "comparison-group" }, h("th", { colSpan: 5, scope: "rowgroup" }, grupo.titulo,
                    grupo.estadoTexto && h("span", null, grupo.estadoTexto))),
                METRICAS.map(([clave, titulo]) => {
                    const metrica = grupo[clave];
                    const diferencia = metrica.diferencia;
                    const clase = diferencia === null || Math.abs(diferencia) < 0.0000001 ? "neutral" : diferencia > 0 ? "positive" : "negative";
                    const formatear = valor => clave === "venta" ? moneda.format(valor) : numero.format(valor);
                    return h("tr", { key: clave }, h("th", { scope: "row" }, titulo),
                        h("td", null, formatear(metrica.base)), h("td", null, formatear(metrica.comparado)),
                        h("td", { className: clase }, diferencia === null ? "Medida incompatible" : `${diferencia > 0 ? "+" : ""}${formatear(diferencia)}`),
                        h("td", { className: clase }, metrica.porcentaje === null
                            ? metrica.estado === "medida-incompatible" ? "No comparable" : metrica.estado === "base-negativa" ? "Base negativa" : "Sin base de comparación"
                            : `${metrica.porcentaje > 0 ? "+" : ""}${numero.format(metrica.porcentaje)} %`)
                    );
                })
            ))
        )
    );
}
