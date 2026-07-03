import {
    eliminarBalance,
    guardarBalance,
    listarBalances
} from "../lib/balanceApi.js";
import { listarCatalogo } from "../lib/catalogApi.js";
import { obtenerProductosBalance } from "../lib/balanceImportParser.js";

const { useEffect, useMemo, useState } = React;
const h = React.createElement;

const BALANCE_VACIO = {
    id: "",
    fecha: obtenerProximoJueves(),
    tipo: "cierre",
    estado: "preparacion",
    productos: []
};

const PRODUCTO_VACIO = {
    PLU: "",
    Producto: "",
    DTO: "",
    Departamento: "",
    UnidadMedida: "uni",
    Categoria: "producto-final",
    CantidadContada: ""
};

export function BalancePage({ productosReporte, backendDisponible, usuario }) {
    const [balance, setBalance] = useState(BALANCE_VACIO);
    const [producto, setProducto] = useState(PRODUCTO_VACIO);
    const [balances, setBalances] = useState([]);
    const [mensaje, setMensaje] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [archivoBalance, setArchivoBalance] = useState("");
    const [catalogoGuardado, setCatalogoGuardado] = useState([]);

    const catalogo = useMemo(() => {
        const porPlu = new Map();
        catalogoGuardado.forEach(item => {
            if (!porPlu.has(item.PLU)) porPlu.set(item.PLU, item);
        });
        productosReporte.forEach(item => {
            if (!porPlu.has(item.PLU)) porPlu.set(item.PLU, item);
        });
        return porPlu;
    }, [catalogoGuardado, productosReporte]);

    useEffect(() => {
        if (!backendDisponible) return;
        cargarBalances(setBalances, setMensaje);
        cargarCatalogoGuardado(setCatalogoGuardado, setMensaje);
    }, [backendDisponible]);

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

    const cambiarProducto = (campo, valor) => {
        if (campo === "PLU" && catalogo.has(valor)) {
            const encontrado = catalogo.get(valor);
            setProducto(actual => ({
                ...actual,
                PLU: valor,
                Producto: encontrado.Producto,
                DTO: encontrado.DTO,
                Departamento: encontrado.Departamento,
                UnidadMedida: encontrado.UnidadMedida || inferirUnidad(encontrado.Producto),
                Categoria: encontrado.Categoria || "producto-final"
            }));
            return;
        }

        setProducto(actual => ({ ...actual, [campo]: valor }));
    };

    const agregarProducto = event => {
        event.preventDefault();
        const nuevo = normalizarProducto(producto);

        if (!nuevo) {
            setMensaje({ tipo: "error", texto: "Complete PLU, producto y departamento." });
            return;
        }

        setBalance(actual => {
            const existe = actual.productos.some(item => item.PLU === nuevo.PLU);
            return {
                ...actual,
                productos: existe
                    ? actual.productos.map(item => item.PLU === nuevo.PLU ? nuevo : item)
                    : [...actual.productos, nuevo]
            };
        });
        setProducto(PRODUCTO_VACIO);
        setMensaje(null);
    };

    const importarArchivoBalance = archivo => {
        if (!archivo) return;

        if (typeof XLSX === "undefined") {
            setMensaje({
                tipo: "error",
                texto: "No se pudo cargar la libreria para leer planillas. Revise la conexion y vuelva a abrir la pagina."
            });
            return;
        }

        const reader = new FileReader();

        reader.onload = event => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const hoja = workbook.SheetNames[0];

                if (!hoja) {
                    setMensaje({ tipo: "error", texto: "El archivo no tiene hojas para importar." });
                    return;
                }

                const filas = XLSX.utils.sheet_to_json(workbook.Sheets[hoja], {
                    header: 1,
                    defval: ""
                });
                const productosImportados = obtenerProductosBalance(filas);

                if (!productosImportados.length) {
                    setMensaje({
                        tipo: "error",
                        texto: "No se encontraron productos validos en la planilla de balance."
                    });
                    return;
                }

                setBalance(actual => ({ ...actual, productos: productosImportados }));
                setArchivoBalance(archivo.name);
                setProducto(PRODUCTO_VACIO);
                setMensaje({
                    tipo: "success",
                    texto: `Se importaron ${productosImportados.length} productos desde ${archivo.name}.`
                });
            } catch (error) {
                console.error(error);
                setMensaje({
                    tipo: "error",
                    texto: "No se pudo importar la planilla. Revise que sea un archivo valido."
                });
            }
        };

        reader.onerror = () => {
            setMensaje({ tipo: "error", texto: "No se pudo leer el archivo seleccionado." });
        };

        reader.readAsArrayBuffer(archivo);
    };

    const cambiarCantidad = (plu, valor) => {
        setBalance(actual => ({
            ...actual,
            productos: actual.productos.map(item =>
                item.PLU === plu ? { ...item, CantidadContada: valor } : item
            )
        }));
    };

    const quitarProducto = plu => {
        setBalance(actual => ({
            ...actual,
            productos: actual.productos.filter(item => item.PLU !== plu)
        }));
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
                    CantidadContada: item.CantidadContada === "" ? null : item.CantidadContada
                }))
            });
            setBalance(desdeMongo(datos.balance));
            setMensaje({ tipo: "success", texto: datos.mensaje });
            await cargarBalances(setBalances, setMensaje, false);
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        } finally {
            setGuardando(false);
        }
    };

    const editar = item => {
        setBalance(desdeMongo(item));
        setProducto(PRODUCTO_VACIO);
        setMensaje(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const nuevoBalance = () => {
        setBalance({ ...BALANCE_VACIO, fecha: obtenerProximoJueves(), productos: [] });
        setProducto(PRODUCTO_VACIO);
        setArchivoBalance("");
        setMensaje(null);
    };

    const borrar = async id => {
        try {
            await eliminarBalance(id);
            setBalances(actual => actual.filter(item => item._id !== id));
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
            h("button", { type: "button", className: "secondary-button", onClick: nuevoBalance }, "Nuevo balance")
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
        h(ImportarBalance, {
            archivoBalance,
            onImportar: importarArchivoBalance
        }),
        h(
            "form",
            { className: "balance-product-form", onSubmit: agregarProducto },
            h("h2", null, "Agregar producto"),
            h(
                "div",
                { className: "balance-product-fields" },
                h(Campo, {
                    label: "PLU",
                    value: producto.PLU,
                    list: "productosReporte",
                    inputMode: "numeric",
                    onChange: valor => cambiarProducto("PLU", valor)
                }),
                h(Campo, {
                    label: "Producto",
                    value: producto.Producto,
                    onChange: valor => cambiarProducto("Producto", valor)
                }),
                h(Campo, {
                    label: "Departamento",
                    value: producto.Departamento,
                    onChange: valor => cambiarProducto("Departamento", valor)
                }),
                h(
                    "label",
                    null,
                    h("span", null, "Se cuenta por"),
                    h(
                        "select",
                        {
                            value: producto.UnidadMedida,
                            onChange: event => cambiarProducto("UnidadMedida", event.target.value)
                        },
                        h("option", { value: "uni" }, "Unidad"),
                        h("option", { value: "kg" }, "Kilogramo")
                    )
                ),
                h(
                    "label",
                    null,
                    h("span", null, "Categoria"),
                    h(
                        "select",
                        {
                            value: producto.Categoria,
                            onChange: event => cambiarProducto("Categoria", event.target.value)
                        },
                        h("option", { value: "producto-final" }, "Producto final"),
                        h("option", { value: "materia-prima" }, "Materia prima")
                    )
                )
            ),
            h(
                "button",
                { type: "submit", className: "add-product-button" },
                balance.productos.some(item => item.PLU === producto.PLU) ? "Actualizar producto" : "Agregar producto"
            ),
            h(
                "datalist",
                { id: "productosReporte" },
                Array.from(catalogo.values()).map(item =>
                    h("option", { key: item.PLU, value: item.PLU }, item.Producto)
                )
            )
        ),
        h(ProductosBalance, {
            productos: balance.productos,
            cambiarCantidad,
            quitarProducto
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
        h(HistorialBalances, { balances, editar, borrar })
    );
}

function ImportarBalance({ archivoBalance, onImportar }) {
    return h(
        "section",
        { className: "balance-import" },
        h(
            "div",
            null,
            h("h2", null, "Importar lista de balance"),
            h("p", null, "Cargue una planilla .ods, .xls o .xlsx para crear la lista de productos a contar.")
        ),
        h("input", {
            type: "file",
            accept: ".ods,.xls,.xlsx",
            "aria-label": "Importar planilla de balance",
            onChange: event => onImportar(event.target.files && event.target.files[0])
        }),
        archivoBalance && h("span", null, `Archivo importado: ${archivoBalance}`)
    );
}

function ProductosBalance({ productos, cambiarCantidad, quitarProducto }) {
    if (!productos.length) {
        return h("p", { className: "balance-empty" }, "Todavia no agregaste productos a este balance.");
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
                h("tr", null, ["PLU", "Producto", "Departamento", "Tipo", "Categoria", "Cantidad", ""].map(titulo => h("th", { key: titulo || "acciones" }, titulo)))
            ),
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
                            null,
                            h("input", {
                                type: "number",
                                min: "0",
                                step: item.UnidadMedida === "kg" ? "0.01" : "1",
                                value: item.CantidadContada,
                                placeholder: "Pendiente",
                                "aria-label": `Cantidad contada de ${item.Producto}`,
                                onChange: event => cambiarCantidad(item.PLU, event.target.value)
                            })
                        ),
                        h(
                            "td",
                            null,
                            h(
                                "button",
                                {
                                    type: "button",
                                    className: "icon-action danger",
                                    title: "Quitar producto",
                                    "aria-label": `Quitar ${item.Producto}`,
                                    onClick: () => quitarProducto(item.PLU)
                                },
                                "x"
                            )
                        )
                    )
                )
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
                              h("span", null, `${item.productos.length} productos · ${item.estado === "contado" ? "Terminado" : "En preparacion"}`)
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

async function cargarBalances(setBalances, setMensaje, mostrarError = true) {
    try {
        const datos = await listarBalances();
        setBalances(datos.balances || []);
    } catch (error) {
        if (mostrarError) setMensaje({ tipo: "error", texto: error.message });
    }
}

function normalizarProducto(producto) {
    const PLU = producto.PLU.trim();
    const Producto = producto.Producto.trim();
    const Departamento = producto.Departamento.trim();
    if (!PLU || !Producto || !Departamento) return null;

    return {
        ...producto,
        PLU,
        Producto,
        Departamento
    };
}

function desdeMongo(balance) {
    return {
        id: balance._id || "",
        fecha: balance.fecha,
        tipo: balance.tipo,
        estado: balance.estado,
        productos: (balance.productos || []).map(item => ({
            PLU: item.PLU,
            Producto: item.Producto,
            DTO: item.DTO || "",
            Departamento: item.Departamento,
            UnidadMedida: item.UnidadMedida,
            Categoria: item.Categoria || "producto-final",
            CantidadContada: item.CantidadContada == null ? "" : item.CantidadContada
        }))
    };
}

async function cargarCatalogoGuardado(setCatalogoGuardado, setMensaje) {
    try {
        const datos = await listarCatalogo({ activo: "true" });
        setCatalogoGuardado(datos.productos || []);
    } catch (error) {
        setMensaje({ tipo: "error", texto: error.message });
    }
}

function inferirUnidad(nombre) {
    return /\bUNI\b/i.test(nombre) ? "uni" : "kg";
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
