import { Footer } from "./components/Footer.js";
import { AuthPage } from "./components/AuthPage.js";
import { AdminPage } from "./components/AdminPage.js";
import { BalancePage } from "./components/BalancePage.js";
import { DateFilter } from "./components/DateFilter.js";
import { DepartmentCharts } from "./components/DepartmentCharts.js";
import { DtoPage, RankingSection } from "./components/RankingSection.js";
import { ReportStorage } from "./components/ReportStorage.js";
import { ReportsPage } from "./components/ReportsPage.js";
import { Sidebar } from "./components/Sidebar.js";
import { ThemeToggle } from "./components/ThemeToggle.js";
import { UploadSection } from "./components/UploadSection.js";
import { obtenerProductos } from "./lib/excelParser.js";
import { obtenerSesion } from "./lib/authApi.js";
import { agruparProductosPorDto, compararProductosRanking, esGrupoTotal } from "./lib/products.js";
import { consultarEstadoBackend, guardarReporteEnBackend } from "./lib/reportApi.js";
import {
    puedeAnalizar,
    puedeGestionarBalances,
    puedeGuardarReportes
} from "./lib/permissions.js";

const { useEffect, useMemo, useState } = React;
const h = React.createElement;

export function PulsoApp() {
    const [productos, setProductos] = useState([]);
    const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
    const [tema, setTema] = useState(obtenerTemaInicial);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState("semana");
    const [nombreArchivo, setNombreArchivo] = useState("");
    const [estadoBackend, setEstadoBackend] = useState({
        conectado: false,
        baseDeDatos: false,
        texto: "Comprobando historial..."
    });
    const [guardandoReporte, setGuardandoReporte] = useState(false);
    const [mensajeGuardado, setMensajeGuardado] = useState(null);
    const [ruta, setRuta] = useState(obtenerRutaActual);
    const [usuario, setUsuario] = useState(null);

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

    useEffect(() => {
        consultarEstadoBackend().then(setEstadoBackend);
        obtenerSesion().then(setUsuario);
    }, []);

    useEffect(() => {
        const actualizarRuta = () => setRuta(obtenerRutaActual());
        window.addEventListener("hashchange", actualizarRuta);
        return () => window.removeEventListener("hashchange", actualizarRuta);
    }, []);

    const limpiarResultados = () => {
        setProductos([]);
        setFechaSeleccionada("semana");
        setNombreArchivo("");
        setMensajeGuardado(null);
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
                setNombreArchivo(archivo.name);
                window.location.hash = puedeAnalizar(usuario) ? "#/ranking" : "#/carga";
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

    const guardarReporte = async () => {
        setGuardandoReporte(true);
        setMensajeGuardado(null);

        try {
            const resultado = await guardarReporteEnBackend(nombreArchivo, productos);
            setMensajeGuardado({ texto: resultado.mensaje, tipo: "success" });
        } catch (error) {
            setMensajeGuardado({ texto: error.message, tipo: "error" });
            setEstadoBackend(await consultarEstadoBackend());
        } finally {
            setGuardandoReporte(false);
        }
    };

    return h(
        "div",
        { className: "app-shell" },
        h(Sidebar, {
            grupos,
            ruta,
            usuario,
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
            h(VistaActual, {
                ruta,
                productos,
                productosVisibles,
                grupos,
                fechas,
                fechaSeleccionada,
                setFechaSeleccionada,
                procesarArchivo,
                mensaje,
                estadoBackend,
                guardandoReporte,
                mensajeGuardado,
                guardarReporte,
                usuario,
                setUsuario
            }),
            h(Footer)
        ),
        h("div", {
            className: "menu-overlay",
            hidden: !menuAbierto,
            onClick: () => setMenuAbierto(false)
        })
    );
}

function VistaActual({
    ruta,
    productos,
    productosVisibles,
    grupos,
    fechas,
    fechaSeleccionada,
    setFechaSeleccionada,
    procesarArchivo,
    mensaje,
    estadoBackend,
    guardandoReporte,
    mensajeGuardado,
    guardarReporte,
    usuario,
    setUsuario
}) {
    if (ruta.vista === "cuenta") {
        return h(AuthPage, {
            usuario,
            onAuthChange: setUsuario,
            backendDisponible: estadoBackend.baseDeDatos
        });
    }

    if (!usuario) {
        return h("section", { className: "empty-view" },
            h("img", {
                src: "assets/images/pulso-de-ventas-icon.png",
                alt: "",
                "aria-hidden": "true"
            }),
            h("h1", null, "Inicie sesion para continuar"),
            h("p", null, "El acceso a reportes, rankings y balances depende del rol asignado."),
            h("a", { className: "primary-link", href: "#/cuenta" }, "Ir al inicio de sesion")
        );
    }

    if (ruta.vista === "admin") {
        return h(AdminPage, { usuario });
    }

    if (ruta.vista === "reportes") {
        return h(ReportsPage, { usuario });
    }

    if (ruta.vista === "balance") {
        if (!puedeGestionarBalances(usuario)) {
            return h("section", { className: "empty-view" },
                h("h1", null, "Acceso restringido"),
                h("p", null, "Balance esta disponible para administradores y referentes.")
            );
        }
        return h(BalancePage, {
            productosReporte: productos,
            backendDisponible: estadoBackend.baseDeDatos,
            usuario
        });
    }

    if (ruta.vista === "carga") {
        return h(
            React.Fragment,
            null,
            h(UploadSection, { onGenerate: procesarArchivo }),
            h(Mensaje, { mensaje }),
            productos.length > 0 &&
                h(ReportStorage, {
                    estado: estadoBackend,
                    usuario,
                    puedeGuardar: puedeGuardarReportes(usuario),
                    guardando: guardandoReporte,
                    mensaje: mensajeGuardado,
                    onSave: guardarReporte
                })
        );
    }

    if (!productos.length) {
        return h(SinReporte);
    }

    const herramientas = h(DateFilter, {
        fechas,
        fechaSeleccionada,
        onChange: setFechaSeleccionada
    });

    if (!productosVisibles.length) {
        return h(React.Fragment, null, herramientas, h("p", { className: "empty-period" }, "No hay ventas registradas para la fecha seleccionada."));
    }

    if (ruta.vista === "graficos") {
        return h(React.Fragment, null, herramientas, h(DepartmentCharts, { grupos }));
    }

    if (ruta.vista === "dto") {
        const grupo = grupos.find(item => String(item.dto) === ruta.dto);
        return h(
            React.Fragment,
            null,
            herramientas,
            grupo
                ? h(DtoPage, { grupo })
                : h("p", { className: "empty-period" }, "Seleccione un departamento desde el menu.")
        );
    }

    return h(React.Fragment, null, herramientas, h(RankingSection, { productos: productosVisibles }));
}

function SinReporte() {
    return h(
        "section",
        { className: "empty-view" },
        h("img", {
            src: "assets/images/pulso-de-ventas-icon.png",
            alt: "",
            "aria-hidden": "true"
        }),
        h("h1", null, "Primero cargue un reporte"),
        h("p", null, "Los rankings y graficos estaran disponibles despues de procesar la venta semanal."),
        h("a", { className: "primary-link", href: "#/carga" }, "Ir a cargar archivo")
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

function obtenerRutaActual() {
    const partes = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const vista = partes[0] || "cuenta";
    const vistasValidas = [
        "carga",
        "ranking",
        "graficos",
        "dto",
        "balance",
        "cuenta",
        "admin",
        "reportes"
    ];

    return {
        vista: vistasValidas.includes(vista) ? vista : "cuenta",
        dto: partes[1] ? decodeURIComponent(partes[1]) : ""
    };
}
