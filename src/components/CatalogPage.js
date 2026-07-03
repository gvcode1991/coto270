import {
    eliminarProductoCatalogo,
    guardarProductoCatalogo,
    importarProductosCatalogo,
    listarCatalogo
} from "../lib/catalogApi.js";
import { obtenerTipoUnidad } from "../lib/products.js";

const { useEffect, useMemo, useState } = React;
const h = React.createElement;

const PRODUCTO_VACIO = {
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

    const productosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return productos.filter(item => {
            const coincideCategoria = !categoria || item.Categoria === categoria;
            const coincideTexto = !texto || [item.PLU, item.Producto, item.Departamento]
                .join(" ")
                .toLowerCase()
                .includes(texto);
            return coincideCategoria && coincideTexto;
        });
    }, [busqueda, categoria, productos]);

    useEffect(() => {
        if (!backendDisponible) return;
        cargarCatalogo(setProductos, setMensaje);
    }, [backendDisponible]);

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
            setProductos(actual => upsertProducto(actual, datos.producto));
            setProducto(PRODUCTO_VACIO);
            setMensaje({ tipo: "success", texto: datos.mensaje });
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        } finally {
            setGuardando(false);
        }
    };

    const editar = item => {
        setProducto({
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

    const borrar = async plu => {
        try {
            await eliminarProductoCatalogo(plu);
            setProductos(actual => actual.filter(item => item.PLU !== plu));
            setMensaje({ tipo: "success", texto: "Producto eliminado del catalogo." });
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
            setMensaje({ tipo: "error", texto: "Primero cargue un reporte 270 para importar productos." });
            return;
        }

        try {
            const datos = await importarProductosCatalogo(importables);
            setMensaje({ tipo: "success", texto: datos.mensaje });
            await cargarCatalogo(setProductos, setMensaje, false);
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
            h("div", null, h("p", { className: "page-eyebrow" }, "Base de productos"), h("h1", null, "Catalogo")),
            h("button", { type: "button", className: "secondary-button", onClick: importarReporte }, "Importar 270 cargado")
        ),
        h(
            "form",
            { className: "catalog-form", onSubmit: guardar },
            h("h2", null, "Producto del catalogo"),
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
                    label: "Categoria",
                    value: producto.Categoria,
                    onChange: valor => cambiar("Categoria", valor),
                    options: [
                        ["producto-final", "Producto final"],
                        ["materia-prima", "Materia prima"]
                    ]
                })
            ),
            h("button", { type: "submit", disabled: guardando }, guardando ? "Guardando..." : "Guardar producto")
        ),
        mensaje && h("p", { className: `balance-message ${mensaje.tipo}`, role: "status" }, mensaje.texto),
        h(
            "div",
            { className: "table-controls catalog-controls" },
            h("input", {
                className: "table-filter",
                value: busqueda,
                placeholder: "Buscar por PLU, producto o departamento",
                onChange: event => setBusqueda(event.target.value)
            }),
            h(
                "select",
                {
                    className: "table-unit-filter",
                    value: categoria,
                    onChange: event => setCategoria(event.target.value)
                },
                h("option", { value: "" }, "Todas"),
                h("option", { value: "producto-final" }, "Producto final"),
                h("option", { value: "materia-prima" }, "Materia prima")
            )
        ),
        h(CatalogTable, { productos: productosFiltrados, editar, borrar })
    );
}

function CatalogTable({ productos, editar, borrar }) {
    if (!productos.length) {
        return h("p", { className: "balance-empty" }, "Todavia no hay productos en el catalogo.");
    }

    return h(
        "div",
        { className: "balance-table-wrap" },
        h(
            "table",
            { className: "catalog-table" },
            h("thead", null, h("tr", null, ["PLU", "Producto", "Departamento", "Tipo", "Categoria", ""].map(titulo => h("th", { key: titulo || "acciones" }, titulo)))),
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
                            h("button", { type: "button", className: "icon-action danger", "aria-label": `Eliminar ${item.Producto}`, onClick: () => borrar(item.PLU) }, "x")
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

async function cargarCatalogo(setProductos, setMensaje, mostrarError = true) {
    try {
        const datos = await listarCatalogo({ activo: "true" });
        setProductos(datos.productos || []);
    } catch (error) {
        if (mostrarError) setMensaje({ tipo: "error", texto: error.message });
    }
}

function upsertProducto(lista, producto) {
    const existe = lista.some(item => item.PLU === producto.PLU);
    const actualizada = existe
        ? lista.map(item => item.PLU === producto.PLU ? producto : item)
        : [...lista, producto];

    return actualizada.sort((a, b) => a.Producto.localeCompare(b.Producto, "es", { sensitivity: "base" }));
}
