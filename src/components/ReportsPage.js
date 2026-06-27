import { Pagination } from "./Pagination.js";
import {
    listarReportesGuardados,
    obtenerReporteGuardado
} from "../lib/reportApi.js";
import { puedeVerReportes } from "../lib/permissions.js";

const { useEffect, useState } = React;
const h = React.createElement;
const FILAS_POR_PAGINA = 15;

export function ReportsPage({ usuario }) {
    const [reportes, setReportes] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [mensaje, setMensaje] = useState("");

    useEffect(() => {
        if (!puedeVerReportes(usuario)) return;
        listarReportesGuardados()
            .then(setReportes)
            .catch(error => setMensaje(error.message));
    }, [usuario && usuario.rol]);

    if (!puedeVerReportes(usuario)) {
        return h("section", { className: "empty-view" },
            h("h1", null, "Acceso restringido"),
            h("p", null, "Los reportes guardados estan disponibles para administradores y gerentes.")
        );
    }

    const abrir = async reporte => {
        try {
            setMensaje("");
            setSeleccionado(await obtenerReporteGuardado(reporte._id));
            setPagina(1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            setMensaje(error.message);
        }
    };

    if (seleccionado) {
        return h(DetalleReporte, {
            reporte: seleccionado,
            pagina,
            setPagina,
            volver: () => setSeleccionado(null)
        });
    }

    return h("section", { className: "reports-page" },
        h("p", { className: "page-eyebrow" }, "Historial"),
        h("h1", null, "Reportes guardados"),
        h("p", { className: "page-description" }, "Resumen de los reportes semanales almacenados en Pulso de Ventas."),
        mensaje && h("p", { className: "auth-message error" }, mensaje),
        reportes.length
            ? h("div", { className: "reports-list" }, reportes.map(reporte =>
                h("article", { className: "report-item", key: reporte._id },
                    h("div", null,
                        h("strong", null, reporte.nombreArchivo),
                        h("span", null, periodoReporte(reporte.periodo)),
                        h("small", null, formatearFechaSimple(reporte.updatedAt))
                    ),
                    h("div", { className: "report-summary" },
                        h("span", null, `${reporte.resumen && reporte.resumen.productos ? reporte.resumen.productos : 0} productos`),
                        h("strong", null, formatearMoneda(reporte.resumen && reporte.resumen.ventaTotal ? reporte.resumen.ventaTotal : 0)),
                        h("button", {
                            type: "button",
                            className: "secondary-button",
                            onClick: () => abrir(reporte)
                        }, "Ver detalle")
                    )
                )
            ))
            : h("p", { className: "empty-period" }, "Todavia no hay reportes guardados.")
    );
}

function DetalleReporte({ reporte, pagina, setPagina, volver }) {
    const productos = reporte.productos || [];
    const totalPaginas = Math.max(1, Math.ceil(productos.length / FILAS_POR_PAGINA));
    const inicio = (pagina - 1) * FILAS_POR_PAGINA;
    const visibles = productos.slice(inicio, inicio + FILAS_POR_PAGINA);

    return h("section", { className: "reports-page" },
        h("div", { className: "page-heading" },
            h("div", null,
                h("p", { className: "page-eyebrow" }, periodoReporte(reporte.periodo)),
                h("h1", null, reporte.nombreArchivo)
            ),
            h("button", { type: "button", className: "secondary-button", onClick: volver }, "Volver")
        ),
        h("div", { className: "report-detail-table" },
            h("table", null,
                h("thead", null,
                    h("tr", null,
                        h("th", null, "PLU"),
                        h("th", null, "Producto"),
                        h("th", null, "Departamento"),
                        h("th", null, "UNI/KG"),
                        h("th", null, "Venta Total")
                    )
                ),
                h("tbody", null, visibles.map(producto =>
                    h("tr", { key: `${producto.PLU}-${producto.DTO}` },
                        h("td", null, producto.PLU),
                        h("td", null, producto.Producto),
                        h("td", null, producto.Departamento),
                        h("td", null, formatearNumero(producto.UniKg)),
                        h("td", null, formatearMoneda(producto.VentaTotal))
                    )
                ))
            )
        ),
        h(Pagination, {
            totalPaginas,
            paginaActual: pagina,
            cambiarPagina: setPagina
        })
    );
}

function periodoReporte(periodo = {}) {
    if (!periodo.inicio) return "Periodo sin fecha";
    return periodo.fin && periodo.fin !== periodo.inicio
        ? `${periodo.inicio} al ${periodo.fin}`
        : periodo.inicio;
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS"
    }).format(valor);
}

function formatearNumero(valor) {
    return new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 2
    }).format(valor || 0);
}

function formatearFechaSimple(fecha) {
    const valor = new Date(fecha);
    if (!Number.isFinite(valor.getTime())) return "Sin fecha registrada";

    const dia = String(valor.getDate()).padStart(2, "0");
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const anio = valor.getFullYear();
    const hora = String(valor.getHours()).padStart(2, "0");
    const minutos = String(valor.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
}
