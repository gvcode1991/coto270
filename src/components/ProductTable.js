import { formatoMoneda } from "../lib/formatters.js";
import {
    compararProductosPorOrden,
    formatearUniKg,
    obtenerTipoUnidad
} from "../lib/products.js";
import { normalizarTexto } from "../lib/text.js";
import { Pagination } from "./Pagination.js";

const { useEffect, useMemo, useState } = React;
const h = React.createElement;

export function ProductTable({ productos, placeholder, pageSize }) {
    const [busqueda, setBusqueda] = useState("");
    const [tipo, setTipo] = useState("todos");
    const [orden, setOrden] = useState("venta-desc");
    const [pagina, setPagina] = useState(1);

    useEffect(() => {
        setPagina(1);
    }, [busqueda, tipo, orden, productos]);

    const filtrados = useMemo(() => {
        const textoBusqueda = normalizarTexto(busqueda);
        return productos
            .filter(producto => {
                const textoProducto = `${producto.PLU} ${producto.Producto} ${producto.UniKg} ${producto.VentaTotal}`;
                const coincideBusqueda = !textoBusqueda || normalizarTexto(textoProducto).includes(textoBusqueda);
                const coincideTipo = tipo === "todos" || obtenerTipoUnidad(producto.Producto) === tipo;
                return coincideBusqueda && coincideTipo;
            })
            .sort((a, b) => compararProductosPorOrden(a, b, orden));
    }, [busqueda, orden, productos, tipo]);

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / pageSize));
    const paginaActual = Math.min(pagina, totalPaginas);
    const productosPagina = filtrados.slice((paginaActual - 1) * pageSize, paginaActual * pageSize);

    return h(
        React.Fragment,
        null,
        h(
            "div",
            { className: "table-controls" },
            h("input", {
                type: "search",
                className: "table-filter",
                placeholder,
                "aria-label": placeholder,
                value: busqueda,
                onChange: event => setBusqueda(event.target.value)
            }),
            h(
                "select",
                {
                    className: "table-unit-filter",
                    "aria-label": "Filtrar por tipo",
                    value: tipo,
                    onChange: event => setTipo(event.target.value)
                },
                h("option", { value: "todos" }, "Todos"),
                h("option", { value: "uni" }, "Solo UNI"),
                h("option", { value: "kg" }, "Solo KG")
            )
        ),
        h(
            "table",
            { className: "data-table" },
            h("thead", null, h(ProductHeader, { orden, setOrden })),
            h(
                "tbody",
                null,
                productosPagina.map(producto =>
                    h(
                        "tr",
                        { key: `${producto.PLU}-${producto.Producto}-${producto.DTO}` },
                        h("td", null, producto.PLU),
                        h("td", null, producto.Producto),
                        h("td", null, formatearUniKg(producto.Producto, producto.UniKg)),
                        h("td", null, formatoMoneda.format(producto.VentaTotal))
                    )
                )
            )
        ),
        h(Pagination, {
            totalPaginas,
            paginaActual,
            cambiarPagina: setPagina
        })
    );
}

function ProductHeader({ orden, setOrden }) {
    const columnas = [
        { texto: "PLU" },
        { texto: "Producto" },
        {
            texto: "UNI/KG",
            ordenes: [
                ["unidades-desc", "v", "Ordenar UNI/KG de mayor a menor"],
                ["unidades-asc", "^", "Ordenar UNI/KG de menor a mayor"]
            ]
        },
        {
            texto: "Venta Total",
            ordenes: [
                ["venta-desc", "v", "Ordenar venta de mayor a menor"],
                ["venta-asc", "^", "Ordenar venta de menor a mayor"]
            ]
        }
    ];

    return h(
        "tr",
        null,
        columnas.map(columna =>
            h(
                "th",
                { key: columna.texto },
                columna.ordenes
                    ? h(
                          "span",
                          { className: "sortable-heading" },
                          h("span", null, columna.texto),
                          h(
                              "span",
                              { className: "sort-actions" },
                              columna.ordenes.map(([valor, texto, aria]) =>
                                  h(
                                      "button",
                                      {
                                          key: valor,
                                          type: "button",
                                          className: `sort-button${orden === valor ? " active" : ""}`,
                                          "aria-label": aria,
                                          "aria-pressed": String(orden === valor),
                                          onClick: () => setOrden(valor)
                                      },
                                      texto
                                  )
                              )
                          )
                      )
                    : columna.texto
            )
        )
    );
}
