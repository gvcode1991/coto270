import { PRODUCTOS_POR_PAGINA, PRODUCTOS_POR_PAGINA_DTO } from "../constants.js";
import { crearIdDto } from "../lib/products.js";
import { ProductTable } from "./ProductTable.js";
import { SummaryTable } from "./SummaryTable.js";

const h = React.createElement;

export function RankingSection({ productos }) {
    return h(
        "div",
        { id: "resultado", "aria-live": "polite" },
        h(
            "section",
            { className: "ranking-table" },
            h("h2", null, "Ranking de Productos"),
            h(SummaryTable, { productos }),
            h(ProductTable, {
                productos,
                placeholder: "Filtrar ranking",
                pageSize: PRODUCTOS_POR_PAGINA
            })
        )
    );
}

export function DtoSection({ grupos }) {
    return h(
        "section",
        { id: "rankingDto", className: "dto-section", "aria-live": "polite" },
        h("h2", null, "Ranking por DTO"),
        h(
            "div",
            { className: "dto-grid" },
            grupos.map(grupo =>
                h(
                    "section",
                    { key: grupo.dto, className: "dto-table", id: crearIdDto(grupo) },
                    h("h3", null, grupo.departamento),
                    h(SummaryTable, { productos: grupo.productos }),
                    h(ProductTable, {
                        productos: grupo.productos,
                        placeholder: `Filtrar ${grupo.departamento}`,
                        pageSize: PRODUCTOS_POR_PAGINA_DTO
                    })
                )
            )
        )
    );
}
