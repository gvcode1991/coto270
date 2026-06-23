import { debeMostrarPagina } from "../lib/products.js";

const h = React.createElement;

export function Pagination({ totalPaginas, paginaActual, cambiarPagina }) {
    if (totalPaginas <= 1) return null;

    const items = [];
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        if (!debeMostrarPagina(pagina, paginaActual, totalPaginas)) continue;
        const ultimaPagina = items[items.length - 1];
        if (typeof ultimaPagina === "number" && pagina - ultimaPagina > 1) items.push("...");
        items.push(pagina);
    }

    return h(
        "div",
        { className: "table-pagination", "aria-label": "Paginacion de tabla" },
        h(
            "button",
            {
                type: "button",
                disabled: paginaActual === 1,
                onClick: () => cambiarPagina(paginaActual - 1)
            },
            "Anterior"
        ),
        items.map((item, index) =>
            item === "..."
                ? h("span", { key: `ellipsis-${index}`, className: "pagination-ellipsis" }, "...")
                : h(
                      "button",
                      {
                          key: item,
                          type: "button",
                          className: paginaActual === item ? "active" : "",
                          onClick: () => cambiarPagina(item)
                      },
                      item
                  )
        ),
        h(
            "button",
            {
                type: "button",
                disabled: paginaActual === totalPaginas,
                onClick: () => cambiarPagina(paginaActual + 1)
            },
            "Siguiente"
        )
    );
}
