import { Footer } from "./components/Footer.js";
import { DateFilter } from "./components/DateFilter.js";
import { DepartmentCharts } from "./components/DepartmentCharts.js";
import { DtoSection, RankingSection } from "./components/RankingSection.js";
import { Sidebar } from "./components/Sidebar.js";
import { ThemeToggle } from "./components/ThemeToggle.js";
import { UploadSection } from "./components/UploadSection.js";
import { obtenerProductos } from "./lib/excelParser.js";
import { agruparProductosPorDto, compararProductosRanking, esGrupoTotal } from "./lib/products.js";

const { useEffect, useMemo, useState } = React;
const h = React.createElement;

export function PulsoApp() {
    const [productos, setProductos] = useState([]);
    const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
    const [tema, setTema] = useState(obtenerTemaInicial);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState("semana");

    const fechas = useMemo(() => obtenerFechasDisponibles(productos), [productos]);
    const productosVisibles = useMemo(
        () => filtrarProductosPorFecha(productos, fechaSeleccionada),
        [fechaSeleccionada, productos]
    );

    const grupos = useMemo(
        () => agruparProductosPorDto(productosVisibles).filter(grupo => !esGrupoTotal(grupo)),
        [productosVisibles]
    );

    useEffect(() => {
        const oscuro = tema === "dark";
        document.body.classList.toggle("theme-dark", oscuro);
        document.body.classList.toggle("theme-light", !oscuro);
        localStorage.setItem("pulsoTema", tema);
    }, [tema]);

    useEffect(() => {
        document.body.classList.toggle("menu-open", menuAbierto);
    }, [menuAbierto]);

    const limpiarResultados = () => {
        setProductos([]);
        setFechaSeleccionada("semana");
        setMensaje({ texto: "", tipo: "" });
    };

    const procesarArchivo = archivo => {
        limpiarResultados();

        if (typeof XLSX === "undefined") {
            setMensaje({
                texto: "No se pudo cargar la libreria para leer planillas. Revise la conexion a internet y vuelva a abrir la pagina.",
                tipo: "error"
            });
            return;
        }

        if (!archivo) {
            setMensaje({ texto: "Seleccione un archivo antes de generar el ranking.", tipo: "error" });
            return;
        }

        const reader = new FileReader();

        reader.onload = event => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const hoja = workbook.SheetNames[0];

                if (!hoja) {
                    setMensaje({ texto: "El archivo no tiene hojas para procesar.", tipo: "error" });
                    return;
                }

                const worksheet = workbook.Sheets[hoja];
                const filas = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: ""
                });
                const lista = obtenerProductos(filas).sort(compararProductosRanking);

                if (!lista.length) {
                    setMensaje({
                        texto: "No se encontraron productos con unidades o ventas para mostrar.",
                        tipo: "info"
                    });
                    return;
                }

                setProductos(lista);
            } catch (error) {
                console.error(error);
                setMensaje({
                    texto: "No se pudo procesar el archivo. Revise que sea una planilla valida.",
                    tipo: "error"
                });
            }
        };

        reader.onerror = () => {
            setMensaje({ texto: "No se pudo leer el archivo seleccionado.", tipo: "error" });
        };

        reader.readAsArrayBuffer(archivo);
    };

    return h(
        "div",
        { className: "app-shell" },
        h(Sidebar, {
            grupos,
            menuAbierto,
            cerrarMenu: () => setMenuAbierto(false),
            alternarMenu: () => setMenuAbierto(abierto => !abierto)
        }),
        h(
            "main",
            { className: "container" },
            h(ThemeToggle, {
                tema,
                alternarTema: () => setTema(actual => (actual === "dark" ? "light" : "dark"))
            }),
            h(UploadSection, { onGenerate: procesarArchivo }),
            h(Mensaje, { mensaje }),
            productos.length > 0 &&
                h(DateFilter, {
                    fechas,
                    fechaSeleccionada,
                    onChange: setFechaSeleccionada
                }),
            productosVisibles.length > 0 && h(RankingSection, { productos: productosVisibles }),
            grupos.length > 0 && h(DepartmentCharts, { grupos }),
            grupos.length > 0 && h(DtoSection, { grupos }),
            productos.length > 0 &&
                productosVisibles.length === 0 &&
                h("p", { className: "empty-period", role: "status" }, "No hay ventas registradas para la fecha seleccionada."),
            h(Footer)
        ),
        h("div", {
            className: "menu-overlay",
            hidden: !menuAbierto,
            onClick: () => setMenuAbierto(false)
        })
    );
}

function Mensaje({ mensaje }) {
    return h("div", { id: "mensaje", className: mensaje.tipo, role: "status", "aria-live": "polite" }, mensaje.texto);
}

function obtenerTemaInicial() {
    const preferenciaGuardada = localStorage.getItem("pulsoTema");
    if (preferenciaGuardada) return preferenciaGuardada;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function obtenerFechasDisponibles(productos) {
    const fechas = new Map();

    productos.forEach(producto => {
        Object.values(producto.VentasPorFecha || {}).forEach(venta => {
            fechas.set(venta.fecha, {
                clave: venta.fecha,
                etiqueta: venta.etiqueta
            });
        });
    });

    return Array.from(fechas.values()).sort((a, b) => a.clave.localeCompare(b.clave));
}

function filtrarProductosPorFecha(productos, fechaSeleccionada) {
    if (fechaSeleccionada === "semana") return productos;

    return productos
        .map(producto => {
            const ventaDiaria = producto.VentasPorFecha?.[fechaSeleccionada];
            if (!ventaDiaria) return null;

            return {
                ...producto,
                UniKg: ventaDiaria.UniKg,
                VentaTotal: ventaDiaria.VentaTotal,
                VentaOriginal: ventaDiaria.VentaTotal
            };
        })
        .filter(producto => producto && (producto.UniKg !== 0 || producto.VentaTotal !== 0))
        .sort(compararProductosRanking);
}
