import {
    eliminarProductoCatalogo,
    guardarProductoCatalogo,
    importarProductosCatalogo,
    listarCatalogo
} from "../lib/catalogApi.js";
import { obtenerTipoUnidad } from "../lib/products.js";
import { Pagination } from "./Pagination.js";

const { useEffect, useState } = React;
const h = React.createElement;
const FILAS_POR_PAGINA = 10;

const PRODUCTO_VACIO = {
    id: "",
    PLU: "",
    Producto: "",
    DTO: "",
    Departamento: "",
    UnidadMedida: "uni",
    Categoria: "producto-final",
    Activo: true
};

export function CatalogPage({ productosReporte, backendDisponible }) {
    const [productos, setProductos] = useState([]);
    const [producto, setProducto] = useState(PRODUCTO_VACIO);
    const [busqueda, setBusqueda] = useState("");
    const [categoria, setCategoria] = useState("");
    const [mensaje, setMensaje] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [pluEnEdicion, setPluEnEdicion] = useState("");
    const [paginacion, setPaginacion] = useState({ total: 0, totalPaginas: 1 });
    const [revision, setRevision] = useState(0);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (!backendDisponible) return;
        let vigente = true;
        setCargando(true);
        listarCatalogo({ activo: "true", busqueda, categoria, pagina, limite: FILAS_POR_PAGINA })
            .then(datos => {
                if (!vigente) return;
                setProductos(datos.productos || []);
                setPaginacion(datos.paginacion);
                setPagina(datos.paginacion.pagina);
            })
            .catch(error => { if (vigente) setMensaje({ tipo: "error", texto: error.message }); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [backendDisponible, busqueda, categoria, pagina, revision]);

    const cambiar = (campo, valor) => {
        setProducto(actual => ({ ...actual, [campo]: valor }));
    };

    const guardar = async event => {
        event.preventDefault();
        if (!backendDisponible) {
            setMensaje({ tipo: "error", texto: "MongoDB no esta disponible en este momento." });
            return;
        }

        setGuardando(true);
        setMensaje(null);

        try {
            const datos = await guardarProductoCatalogo(producto);
            setRevision(actual => actual + 1);
            setProducto(PRODUCTO_VACIO);
            setPluEnEdicion("");
            setMensaje({ tipo: "success", texto: datos.mensaje });
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        } finally {
            setGuardando(false);
        }
    };

    const editar = item => {
        setPluEnEdicion(item.PLU);
        setProducto({
            id: item._id,
            PLU: item.PLU,
            Producto: item.Producto,
            DTO: item.DTO || "",
            Departamento: item.Departamento,
            UnidadMedida: item.UnidadMedida,
            Categoria: item.Categoria || "producto-final",
            Activo: item.Activo !== false
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const borrar = async item => {
        if (!confirmarAccion(`Seguro que quiere eliminar ${item.Producto} del inventario?`)) return;
        try {
            await eliminarProductoCatalogo(item.PLU);
            setRevision(actual => actual + 1);
            if (pluEnEdicion === item.PLU) {
                setProducto(PRODUCTO_VACIO);
                setPluEnEdicion("");
            }
            setMensaje({ tipo: "success", texto: "Producto eliminado del inventario." });
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        }
    };

    const importarReporte = async () => {
        const importables = productosReporte.map(item => ({
            PLU: item.PLU,
            Producto: item.Producto,
            DTO: item.DTO,
            Departamento: item.Departamento,
            UnidadMedida: obtenerTipoUnidad(item.Producto),
            Categoria: "producto-final",
            Activo: true
        }));

        if (!importables.length) {
            setMensaje({ tipo: "error", texto: "Cargá una planilla de ventas compatible antes de importar productos." });
            return;
        }

        try {
            const datos = await importarProductosCatalogo(importables);
            setMensaje({ tipo: "success", texto: datos.mensaje });
            setRevision(actual => actual + 1);
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        }
    };

    return h(
        "section",
        { className: "catalog-page" },
        h(
            "div",
            { className: "page-heading" },
            h("div", null, h("p", { className: "page-eyebrow" }, "Base de productos"), h("h1", null, "Inventario")),
            h("button", { type: "button", className: "secondary-button", onClick: importarReporte }, "Importar productos del reporte")
        ),
        h(
            "form",
            { className: "catalog-form", onSubmit: guardar },
            h("div", { className: "section-heading" },
                h("p", { className: "page-eyebrow" }, "Productos"),
                h("h2", null, pluEnEdicion ? "Editar producto" : "Agregar producto")
            ),
            h(
                "div",
                { className: "catalog-fields" },
                h(Campo, { label: "PLU", value: producto.PLU, onChange: valor => cambiar("PLU", valor) }),
                h(Campo, { label: "Producto", value: producto.Producto, onChange: valor => cambiar("Producto", valor) }),
                h(Campo, { label: "Departamento", value: producto.Departamento, onChange: valor => cambiar("Departamento", valor) }),
                h(Campo, { label: "DTO", value: producto.DTO, required: false, onChange: valor => cambiar("DTO", valor) }),
                h(Selector, {
                    label: "Se cuenta por",
                    value: producto.UnidadMedida,
                    onChange: valor => cambiar("UnidadMedida", valor),
                    options: [
                        ["uni", "Unidad"],
                        ["kg", "Kilogramo"]
                    ]
                }),
                h(Selector, {
                    label: "Categoría",
                    value: producto.Categoria,
                    onChange: valor => cambiar("Categoria", valor),
                    options: [
                        ["producto-final", "Producto final"],
                        ["materia-prima", "Materia prima"]
                    ]
                })
            ),
            h(
                "div",
                { className: "catalog-form-actions" },
                h("button", { type: "submit", disabled: guardando }, guardando ? "Guardando..." : "Guardar producto"),
                pluEnEdicion && h("button", {
                    type: "button",
                    className: "secondary-button",
                    onClick: () => {
                        setProducto(PRODUCTO_VACIO);
                        setPluEnEdicion("");
                    }
                }, "Cancelar edicion")
            )
        ),
        mensaje && h("p", { className: `balance-message ${mensaje.tipo}`, role: "status" }, mensaje.texto),
        h("div", { className: "section-heading catalog-list-heading" },
            h("p", { className: "page-eyebrow" }, "Lista de productos"),
            h("h2", null, "Productos agregados"),
            h("span", { className: "result-count" }, `${paginacion.total} producto${paginacion.total === 1 ? "" : "s"}`)
        ),
        h(
            "div",
            { className: "table-controls catalog-controls" },
            h("input", {
                className: "table-filter",
                value: busqueda,
                placeholder: "Buscar por PLU, producto o departamento",
                onChange: event => { setBusqueda(event.target.value); setPagina(1); }
            }),
            h(
                "select",
                {
                    className: "table-unit-filter",
                    value: categoria,
                    onChange: event => { setCategoria(event.target.value); setPagina(1); }
                },
                h("option", { value: "" }, "Todas"),
                h("option", { value: "producto-final" }, "Producto final"),
                h("option", { value: "materia-prima" }, "Materia prima")
            )
        ),
        cargando ? h("p", { role: "status" }, "Cargando productos...") : h(CatalogTable, { productos, editar, borrar }),
        h(Pagination, {
            totalPaginas: paginacion.totalPaginas,
            paginaActual: pagina,
            cambiarPagina: setPagina,
            disabled: cargando
        })
    );
}

function CatalogTable({ productos, editar, borrar }) {
    if (!productos.length) {
        return h("p", { className: "balance-empty" }, "Todavia no hay productos en el inventario.");
    }

    return h(
        "div",
        { className: "balance-table-wrap" },
        h(
            "table",
            { className: "catalog-table" },
            h("thead", null, h("tr", null, ["PLU", "Producto", "Departamento", "Tipo", "Categoría", ""].map(titulo => h("th", { key: titulo || "acciones" }, titulo)))),
            h(
                "tbody",
                null,
                productos.map(item =>
                    h(
                        "tr",
                        { key: item.PLU },
                        h("td", null, item.PLU),
                        h("td", null, item.Producto),
                        h("td", null, item.Departamento),
                        h("td", null, item.UnidadMedida === "uni" ? "UNI" : "KG"),
                        h("td", null, item.Categoria === "materia-prima" ? "Materia prima" : "Producto final"),
                        h(
                            "td",
                            { className: "catalog-actions" },
                            h("button", { type: "button", className: "secondary-button", onClick: () => editar(item) }, "Editar"),
                            h("button", { type: "button", className: "icon-action danger", "aria-label": `Eliminar ${item.Producto}`, onClick: () => borrar(item) }, "x")
                        )
                    )
                )
            )
        )
    );
}

function Campo({ label, onChange, required = true, ...props }) {
    return h(
        "label",
        null,
        h("span", null, label),
        h("input", {
            ...props,
            required,
            onChange: event => onChange(event.target.value)
        })
    );
}

function Selector({ label, value, onChange, options }) {
    return h(
        "label",
        null,
        h("span", null, label),
        h(
            "select",
            { value, onChange: event => onChange(event.target.value) },
            options.map(([valor, texto]) => h("option", { key: valor, value: valor }, texto))
        )
    );
}

function confirmarAccion(mensaje) {
    return typeof window === "undefined" || window.confirm(mensaje);
}
