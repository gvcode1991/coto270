import {
    eliminarBalance,
    guardarBalance,
    listarBalances
} from "../lib/balanceApi.js";
import { listarInventarioCompleto } from "../lib/catalogApi.js";
import {
    abrirBalanceGuardado,
    agregarProductosDelInventario,
    crearProductosDesdeInventario
} from "../lib/balanceProducts.js";
import { Pagination } from "./Pagination.js";
import { normalizarCantidadContada, normalizarCantidadProducto } from "../lib/balanceQuantities.js";

const { useEffect, useMemo, useState } = React;
const h = React.createElement;
const FILAS_POR_PAGINA = 10;

const BALANCE_VACIO = {
    id: "",
    fecha: obtenerProximoJueves(),
    tipo: "cierre",
    estado: "preparacion",
    productos: []
};

export function BalancePage({ backendDisponible, usuario }) {
    const [balance, setBalance] = useState(BALANCE_VACIO);
    const [balances, setBalances] = useState([]);
    const [mensaje, setMensaje] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [catalogoGuardado, setCatalogoGuardado] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [paginaHistorial, setPaginaHistorial] = useState(1);
    const [totalPaginasHistorial, setTotalPaginasHistorial] = useState(1);
    const [revisionHistorial, setRevisionHistorial] = useState(0);

    const productosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return balance.productos;
        return balance.productos.filter(item =>
            [item.PLU, item.Producto, item.Departamento, item.Categoria]
                .join(" ")
                .toLowerCase()
                .includes(texto)
        );
    }, [balance.productos, busqueda]);

    const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / FILAS_POR_PAGINA));
    const productosPagina = productosFiltrados.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

    useEffect(() => {
        if (!backendDisponible) return;
        cargarCatalogoGuardado(setCatalogoGuardado, setMensaje);
    }, [backendDisponible]);

    useEffect(() => {
        if (!backendDisponible) return;
        let vigente = true;
        listarBalances(paginaHistorial).then(datos => {
            if (!vigente) return;
            setBalances(datos.balances || []);
            setPaginaHistorial(datos.paginacion.pagina);
            setTotalPaginasHistorial(datos.paginacion.totalPaginas);
        }).catch(error => { if (vigente) setMensaje({ tipo: "error", texto: error.message }); });
        return () => { vigente = false; };
    }, [backendDisponible, paginaHistorial, revisionHistorial]);

    useEffect(() => {
        if (balance.id || balance.productos.length || !catalogoGuardado.length) return;
        setBalance(actual => actual.id || actual.productos.length ? actual : ({
            ...actual,
            productos: crearProductosDesdeInventario(catalogoGuardado)
        }));
    }, [balance.id, balance.productos.length, catalogoGuardado]);

    useEffect(() => {
        setPagina(1);
    }, [busqueda, balance.id]);

    useEffect(() => {
        if (pagina > totalPaginas) setPagina(totalPaginas);
    }, [pagina, totalPaginas]);

    if (!usuario) {
        return h(
            "section",
            { className: "empty-view" },
            h("img", {
                src: "assets/images/pulso-de-ventas-icon.png",
                alt: "",
                "aria-hidden": "true"
            }),
            h("h1", null, "Inicie sesion para usar Balance"),
            h("p", null, "Los productos y conteos se guardan de forma segura en su cuenta."),
            h("a", { className: "primary-link", href: "#/cuenta" }, "Ingresar o registrarse")
        );
    }

    const cambiarCantidad = (plu, valor) => {
        setBalance(actual => ({
            ...actual,
            productos: actual.productos.map(item =>
                item.PLU === plu ? { ...item, CantidadContada: valor } : item
            )
        }));
    };

    const sincronizarInventario = () => {
        if (!catalogoGuardado.length) {
            setMensaje({ tipo: "error", texto: "Primero cargue productos en Inventario." });
            return;
        }
        setBalance(actual => ({
            ...actual,
            productos: agregarProductosDelInventario(catalogoGuardado, actual.productos)
        }));
        setMensaje({ tipo: "success", texto: "Productos nuevos incorporados. Se conservaron los datos y cantidades existentes. Guarde el balance para registrar los cambios." });
    };

    const guardar = async () => {
        if (!backendDisponible) {
            setMensaje({ tipo: "error", texto: "MongoDB no esta disponible en este momento." });
            return;
        }

        setGuardando(true);
        setMensaje(null);

        try {
            const datos = await guardarBalance({
                ...balance,
                productos: balance.productos.map(item => ({
                    ...item,
                    CantidadContada: normalizarCantidadProducto(item)
                }))
            });
            setBalance(abrirBalanceGuardado(datos.balance));
            setMensaje({ tipo: "success", texto: datos.mensaje });
            setRevisionHistorial(actual => actual + 1);
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        } finally {
            setGuardando(false);
        }
    };

    const editar = item => {
        setBalance(abrirBalanceGuardado(item));
        setBusqueda("");
        setMensaje(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const nuevoBalance = () => {
        setBalance({
            ...BALANCE_VACIO,
            fecha: obtenerProximoJueves(),
            productos: crearProductosDesdeInventario(catalogoGuardado)
        });
        setBusqueda("");
        setMensaje(null);
    };

    const borrar = async id => {
        if (!confirmarAccion("Seguro que quiere eliminar este balance guardado?")) return;
        try {
            await eliminarBalance(id);
            setRevisionHistorial(actual => actual + 1);
            if (balance.id === id) nuevoBalance();
            setMensaje({ tipo: "success", texto: "Balance eliminado correctamente." });
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        }
    };

    return h(
        "section",
        { className: "balance-page" },
        h(
            "div",
            { className: "page-heading" },
            h("div", null, h("p", { className: "page-eyebrow" }, "Conteo mensual"), h("h1", null, "Balance")),
            h(
                "div",
                { className: "page-actions" },
                h("button", { type: "button", className: "secondary-button", disabled: guardando, onClick: sincronizarInventario }, "Agregar productos del inventario"),
                h("button", { type: "button", className: "secondary-button", onClick: nuevoBalance }, "Nuevo balance")
            )
        ),
        h(
            "div",
            { className: "balance-metadata" },
            h(Campo, {
                label: "Fecha del conteo",
                type: "date",
                value: balance.fecha,
                onChange: valor => setBalance(actual => ({ ...actual, fecha: valor }))
            }),
            h(
                "label",
                null,
                h("span", null, "Tipo de balance"),
                h(
                    "select",
                    {
                        value: balance.tipo,
                        onChange: event => setBalance(actual => ({ ...actual, tipo: event.target.value }))
                    },
                    h("option", { value: "parcial-1" }, "Primer parcial"),
                    h("option", { value: "parcial-2" }, "Segundo parcial"),
                    h("option", { value: "cierre" }, "Cierre mensual")
                )
            ),
            h(
                "label",
                null,
                h("span", null, "Estado"),
                h(
                    "select",
                    {
                        value: balance.estado,
                        onChange: event => setBalance(actual => ({ ...actual, estado: event.target.value }))
                    },
                    h("option", { value: "preparacion" }, "En preparacion"),
                    h("option", { value: "contado" }, "Conteo terminado")
                )
            )
        ),
        h(
            "section",
            { className: "balance-inventory-source" },
            h(
                "div",
                null,
                h("h2", null, balance.id ? "Productos del balance" : "Productos del inventario"),
                h("p", null, balance.id
                    ? "Este balance conserva los productos y medidas registrados en la fecha del conteo."
                    : "El balance toma como referencia los productos activos cargados en Inventario. Complete la cantidad contada en cada fila y guarde el balance.")
            ),
            h("strong", null, `${catalogoGuardado.length} producto${catalogoGuardado.length === 1 ? "" : "s"} en inventario`)
        ),
        h(
            "div",
            { className: "table-controls catalog-controls" },
            h("input", {
                className: "table-filter",
                value: busqueda,
                placeholder: "Buscar producto del balance",
                onChange: event => setBusqueda(event.target.value)
            })
        ),
        h(ProductosBalance, {
            productos: productosPagina,
            cambiarCantidad
        }),
        h(Pagination, {
            totalPaginas,
            paginaActual: pagina,
            cambiarPagina: setPagina
        }),
        h(
            "div",
            { className: "balance-save-row" },
            h(
                "span",
                null,
                `${balance.productos.length} producto${balance.productos.length === 1 ? "" : "s"} para contar`
            ),
            h(
                "button",
                {
                    type: "button",
                    disabled: guardando || !backendDisponible || !balance.productos.length,
                    onClick: guardar
                },
                guardando ? "Guardando..." : "Guardar balance"
            )
        ),
        mensaje && h("p", { className: `balance-message ${mensaje.tipo}`, role: "status" }, mensaje.texto),
        h(HistorialBalances, { balances, editar, borrar }),
        h(Pagination, { totalPaginas: totalPaginasHistorial, paginaActual: paginaHistorial, cambiarPagina: setPaginaHistorial })
    );
}

function ProductosBalance({ productos, cambiarCantidad }) {
    if (!productos.length) {
        return h("p", { className: "balance-empty" }, "No hay productos para mostrar en este balance.");
    }

    return h(
        "div",
        { className: "balance-table-wrap" },
        h(
            "table",
            { className: "balance-table" },
            h(
                "thead",
                null,
                h("tr", null, ["PLU", "Producto", "Departamento", "Tipo", "Categoria", "Cantidad"].map(titulo => h("th", { key: titulo }, titulo)))
            ),
            h(
                "tbody",
                null,
                productos.map(item => {
                    let errorCantidad = "";
                    try {
                        normalizarCantidadContada(item.CantidadContada, item.UnidadMedida);
                    } catch (error) {
                        errorCantidad = error.message;
                    }
                    return h(
                        "tr",
                        { key: item.PLU },
                        h("td", null, item.PLU),
                        h("td", null, item.Producto),
                        h("td", null, item.Departamento),
                        h("td", null, item.UnidadMedida === "uni" ? "UNI" : "KG"),
                        h("td", null, item.Categoria === "materia-prima" ? "Materia prima" : "Producto final"),
                        h(
                            "td",
                            null,
                            h("input", {
                                type: "text",
                                inputMode: item.UnidadMedida === "kg" ? "decimal" : "numeric",
                                value: item.CantidadContada,
                                placeholder: "Pendiente",
                                "aria-label": `Cantidad contada de ${item.Producto}`,
                                "aria-invalid": Boolean(errorCantidad),
                                "aria-describedby": errorCantidad ? `cantidad-error-${item.PLU}` : undefined,
                                onChange: event => cambiarCantidad(item.PLU, event.target.value)
                            }),
                            errorCantidad && h("small", {
                                id: `cantidad-error-${item.PLU}`,
                                className: "quantity-error"
                            }, errorCantidad)
                        )
                    );
                })
            )
        )
    );
}

function HistorialBalances({ balances, editar, borrar }) {
    return h(
        "section",
        { className: "balance-history" },
        h("h2", null, "Balances guardados"),
        balances.length
            ? h(
                  "div",
                  { className: "balance-history-list" },
                  balances.map(item =>
                      h(
                          "article",
                          { key: item._id, className: "balance-history-item" },
                          h(
                              "div",
                              null,
                              h("strong", null, `${etiquetaTipo(item.tipo)} - ${formatearFecha(item.fecha)}`),
                              h("span", null, `${item.productos.length} productos - ${item.estado === "contado" ? "Terminado" : "En preparacion"}`)
                          ),
                          h(
                              "div",
                              { className: "history-actions" },
                              h("button", { type: "button", className: "secondary-button", onClick: () => editar(item) }, "Abrir"),
                              h("button", { type: "button", className: "icon-action danger", "aria-label": "Eliminar balance", onClick: () => borrar(item._id) }, "x")
                          )
                      )
                  )
              )
            : h("p", { className: "balance-empty" }, "No hay balances guardados todavia.")
    );
}

function Campo({ label, onChange, ...props }) {
    return h(
        "label",
        null,
        h("span", null, label),
        h("input", {
            ...props,
            onChange: event => onChange(event.target.value)
        })
    );
}

async function cargarCatalogoGuardado(setCatalogoGuardado, setMensaje) {
    try {
        setCatalogoGuardado(await listarInventarioCompleto());
    } catch (error) {
        setMensaje({ tipo: "error", texto: error.message });
    }
}

function obtenerProximoJueves() {
    const fecha = new Date();
    const dias = (4 - fecha.getDay() + 7) % 7;
    fecha.setDate(fecha.getDate() + dias);
    return [
        fecha.getFullYear(),
        String(fecha.getMonth() + 1).padStart(2, "0"),
        String(fecha.getDate()).padStart(2, "0")
    ].join("-");
}

function formatearFecha(valor) {
    const [anio, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${anio}`;
}

function etiquetaTipo(tipo) {
    if (tipo === "parcial-1") return "Primer parcial";
    if (tipo === "parcial-2") return "Segundo parcial";
    return "Cierre mensual";
}

function confirmarAccion(mensaje) {
    return typeof window === "undefined" || window.confirm(mensaje);
}
