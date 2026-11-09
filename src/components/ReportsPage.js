import { Pagination } from "./Pagination.js";
import {
    listarReportesGuardados,
    obtenerReporteGuardado,
    compararReportesGuardados
} from "../lib/reportApi.js";
import { puedeVerReportes } from "../lib/permissions.js";
import { obtenerTipoUnidad } from "../lib/products.js";
import { ReportComparisonSelector } from "./ReportComparisonSelector.js";
import { ReportComparisonPage } from "./ReportComparisonPage.js";

const { useEffect, useState } = React;
const h = React.createElement;
const FILAS_POR_PAGINA = 15;

export function ReportsPage({ usuario }) {
    const [reportes, setReportes] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [mensaje, setMensaje] = useState("");
    const [paginaHistorial, setPaginaHistorial] = useState(1);
    const [totalPaginasHistorial, setTotalPaginasHistorial] = useState(1);
    const [cargando, setCargando] = useState(true);
    const [abriendo, setAbriendo] = useState(false);
    const [filtros, setFiltros] = useState({ busqueda: "", desde: "", hasta: "" });
    const [consulta, setConsulta] = useState(filtros);
    const [revision, setRevision] = useState(0);
    const [semanas, setSemanas] = useState({ base: null, comparado: null });
    const [comparacion, setComparacion] = useState(null);
    const [comparando, setComparando] = useState(false);
    const [errorComparacion, setErrorComparacion] = useState("");

    useEffect(() => {
        if (!puedeVerReportes(usuario)) return;
        let vigente = true;
        setCargando(true);
        setMensaje("");
        listarReportesGuardados(paginaHistorial, consulta)
            .then(datos => {
                if (!vigente) return;
                setReportes(datos.reportes || []);
                setPaginaHistorial(datos.paginacion.pagina);
                setTotalPaginasHistorial(datos.paginacion.totalPaginas);
            })
            .catch(error => { if (vigente) { setReportes([]); setMensaje(error.message); } })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [usuario && usuario.rol, paginaHistorial, consulta, revision]);

    if (!puedeVerReportes(usuario)) {
        return h("section", { className: "empty-view" },
            h("h1", null, "Acceso restringido"),
            h("p", null, "Los reportes guardados están disponibles para administradores y gerentes.")
        );
    }

    const abrir = async reporte => {
        if (abriendo) return;
        setAbriendo(true);
        try {
            setMensaje("");
            setSeleccionado(await obtenerReporteGuardado(reporte._id));
            setPagina(1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            setMensaje(error.message);
        } finally { setAbriendo(false); }
    };

    const comparar = async () => {
        if (comparando || abriendo || !semanas.base || !semanas.comparado || semanas.base._id === semanas.comparado._id) return;
        setComparando(true); setErrorComparacion(""); setComparacion(null);
        try {
            setComparacion(await compararReportesGuardados(semanas.base._id, semanas.comparado._id));
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) { setErrorComparacion(error.message); }
        finally { setComparando(false); }
    };
    const seleccionarSemana = (clave, reporte) => {
        setSemanas(actual => ({ ...actual, [clave]: reporte })); setErrorComparacion("");
    };

    if (comparacion) return h(ReportComparisonPage, { comparacion, volver: () => setComparacion(null) });

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
        h(ReportComparisonSelector, { seleccion: semanas, cambiar: seleccionarSemana, comparar, cargando: comparando, bloqueado: abriendo, error: errorComparacion }),
        h("form", { className: "report-filters", onSubmit: event => {
            event.preventDefault(); setConsulta({ ...filtros }); setPaginaHistorial(1);
        } },
            h("label", null, "Nombre del archivo", h("input", { value: filtros.busqueda, maxLength: 120, type: "search", onChange: e => setFiltros(actual => ({ ...actual, busqueda: e.target.value })) })),
            h("label", null, "Desde", h("input", { type: "date", value: filtros.desde, onChange: e => setFiltros(actual => ({ ...actual, desde: e.target.value })) })),
            h("label", null, "Hasta", h("input", { type: "date", value: filtros.hasta, min: filtros.desde || undefined, onChange: e => setFiltros(actual => ({ ...actual, hasta: e.target.value })) })),
            h("button", { type: "submit", className: "secondary-button", disabled: cargando }, "Buscar"),
            h("button", { type: "button", className: "secondary-button", onClick: () => {
                const vacios = { busqueda: "", desde: "", hasta: "" }; setFiltros(vacios); setConsulta(vacios); setPaginaHistorial(1);
            } }, "Limpiar")
        ),
        mensaje && h("div", { className: "auth-message error", role: "alert" }, mensaje,
            h("button", { type: "button", className: "secondary-button", onClick: () => setRevision(valor => valor + 1) }, "Volver a intentar")),
        cargando ? h("p", { role: "status" }, "Cargando reportes…") : reportes.length
            ? h("div", { className: "reports-list" }, reportes.map(reporte =>
                h("article", { className: "report-item", key: reporte._id },
                    h("div", null,
                        h("strong", null, reporte.nombreArchivo),
                        h("span", null, periodoReporte(reporte.periodo)),
                        h("small", null, `Guardado: ${formatearFechaSimple(reporte.createdAt || reporte.updatedAt)}`),
                        h("small", null, reporte.autor?.nombre ? `Por ${reporte.autor.nombre}` : "Autor no registrado (histórico)")
                    ),
                    h("div", { className: "report-summary" },
                        h("span", null, `${reporte.resumen?.productos || 0} producto${reporte.resumen?.productos === 1 ? "" : "s"}`),
                        h("strong", null, formatearMoneda(reporte.resumen && reporte.resumen.ventaTotal ? reporte.resumen.ventaTotal : 0)),
                        h("button", {
                            type: "button",
                            className: "secondary-button",
                            disabled: abriendo || comparando,
                            onClick: () => abrir(reporte)
                        }, "Ver detalle"),
                        h("div", { className: "report-compare-actions" },
                            h("button", { type: "button", className: "secondary-button", disabled: comparando || [semanas.base?._id, semanas.comparado?._id].includes(reporte._id), onClick: () => seleccionarSemana("base", reporte) }, "Usar como base"),
                            h("button", { type: "button", className: "secondary-button", disabled: comparando || [semanas.base?._id, semanas.comparado?._id].includes(reporte._id), onClick: () => seleccionarSemana("comparado", reporte) }, "Usar para comparar")
                        )
                    )
                )
            ))
            : !mensaje && h("p", { className: "empty-period" }, "No hay reportes que coincidan con la búsqueda."),
        abriendo && h("p", { role: "status" }, "Abriendo reporte…"),
        !mensaje && h(Pagination, { totalPaginas: totalPaginasHistorial, paginaActual: paginaHistorial, cambiarPagina: setPaginaHistorial, disabled: cargando || abriendo })
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
        h("p", { className: "page-description" }, `Guardado: ${formatearFechaSimple(reporte.createdAt || reporte.updatedAt)} · ${reporte.autor?.nombre || "Autor no registrado (histórico)"}`),
        !reporte.periodo?.inicio && h("p", { role: "status" }, "El archivo no contiene fechas identificables. Se conserva sin asignarle una semana."),
        h(ResumenReporte, { productos }),
        h("div", { className: "report-detail-table" },
            h("table", null,
                h("thead", null,
                    h("tr", null,
                        h("th", null, "PLU"),
                        h("th", null, "Producto"),
                        h("th", null, "Departamento"),
                        h("th", null, "Medida"),
                        h("th", null, "UNI/KG"),
                        h("th", null, "Venta Total")
                    )
                ),
                h("tbody", null, visibles.map(producto =>
                    h("tr", { key: `${producto.PLU}-${producto.DTO}` },
                        h("td", null, producto.PLU),
                        h("td", null, producto.Producto),
                        h("td", null, producto.Departamento),
                        h("td", null, (producto.UnidadMedida || obtenerTipoUnidad(producto.Producto)).toUpperCase()),
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

function ResumenReporte({ productos }) {
    const totales = productos.reduce((total, producto) => {
        const medida = producto.UnidadMedida || obtenerTipoUnidad(producto.Producto);
        total[medida] += producto.UniKg || 0;
        total.venta += producto.VentaTotal || 0;
        return total;
    }, { uni: 0, kg: 0, venta: 0 });
    return h("dl", { className: "report-totals" },
        [["Productos", productos.length], ["Unidades", formatearNumero(totales.uni)], ["Kilogramos", formatearNumero(totales.kg)], ["Venta total", formatearMoneda(totales.venta)]].map(([titulo, valor]) =>
            h("div", { key: titulo }, h("dt", null, titulo), h("dd", null, valor)))
    );
}

function periodoReporte(periodo = {}) {
    if (!periodo.inicio) return "Período sin fecha";
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
