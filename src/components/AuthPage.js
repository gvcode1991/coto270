import {
    cerrarOtrasSesiones,
    cerrarSesion,
    cerrarSesionRemota,
    iniciarSesion,
    obtenerActividad,
    obtenerSesiones,
    recuperarPassword,
    regenerarCodigoRecuperacion,
    registrarUsuario
} from "../lib/authApi.js";
import { etiquetaRol } from "../lib/permissions.js";

const { useEffect, useState } = React;
const h = React.createElement;

export function AuthPage({ usuario, onAuthChange, backendDisponible }) {
    const [modo, setModo] = useState("login");
    const [formulario, setFormulario] = useState(formularioInicial);
    const [mensaje, setMensaje] = useState(null);
    const [codigo, setCodigo] = useState("");
    const [procesando, setProcesando] = useState(false);

    if (usuario) return h(AccountPanel, { usuario, onAuthChange });

    const enviar = async event => {
        event.preventDefault();
        if (!backendDisponible) {
            setMensaje({ tipo: "error", texto: "El servidor de usuarios no esta disponible." });
            return;
        }

        setProcesando(true);
        setMensaje(null);
        try {
            if (modo === "recuperar") {
                const datos = await recuperarPassword(formulario);
                setCodigo(datos.recoveryCode);
                setMensaje({ tipo: "success", texto: datos.mensaje });
                return;
            }

            const datos = modo === "registro"
                ? await registrarUsuario(formulario)
                : await iniciarSesion(formulario);
            setCodigo(datos.recoveryCode || "");
            setMensaje({ tipo: "success", texto: datos.mensaje });

            if (modo === "registro" && datos.requiereAprobacion) return;
            onAuthChange(datos.usuario);
            window.location.hash = "#/carga";
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        } finally {
            setProcesando(false);
        }
    };

    const cambiarModo = nuevoModo => {
        setModo(nuevoModo);
        setMensaje(null);
        setCodigo("");
    };

    return h(
        "section",
        { className: "auth-page" },
        h(
            "div",
            { className: "auth-brand" },
            h("img", { src: "assets/images/pulso-de-ventas-logo.png", alt: "Pulso de Ventas" }),
            h("p", null, "Analiza ventas semanales, prepara balances y compara resultados por producto y departamento.")
        ),
        h("p", { className: "page-eyebrow" }, modo === "recuperar" ? "Recuperacion" : "Acceso"),
        h("h1", null, tituloModo(modo)),
        modo !== "recuperar" && h(
            "div",
            { className: "auth-tabs", role: "tablist", "aria-label": "Acceso de usuarios" },
            h(Tab, { activo: modo === "login", onClick: () => cambiarModo("login") }, "Ingresar"),
            h(Tab, { activo: modo === "registro", onClick: () => cambiarModo("registro") }, "Registrarse")
        ),
        h(
            "form",
            { className: "auth-form", onSubmit: enviar },
            modo === "registro" && h(CampoAuth, {
                label: "Nombre",
                autoComplete: "name",
                value: formulario.nombre,
                onChange: valor => actualizar(setFormulario, "nombre", valor)
            }),
            modo === "registro" && h(CampoAuth, {
                label: "Apellido",
                autoComplete: "family-name",
                value: formulario.apellido,
                onChange: valor => actualizar(setFormulario, "apellido", valor)
            }),
            modo === "registro" && h(CampoAuth, {
                label: "Legajo (opcional)",
                required: false,
                inputMode: "numeric",
                value: formulario.legajo,
                onChange: valor => actualizar(setFormulario, "legajo", valor)
            }),
            h(CampoAuth, {
                label: "Correo",
                type: "email",
                autoComplete: "email",
                value: formulario.email,
                onChange: valor => actualizar(setFormulario, "email", valor)
            }),
            modo === "recuperar" && h(CampoAuth, {
                label: "Codigo de recuperacion",
                value: formulario.recoveryCode,
                onChange: valor => actualizar(setFormulario, "recoveryCode", valor)
            }),
            h(CampoAuth, {
                label: modo === "recuperar" ? "Nueva contrasena" : "Contrasena",
                type: "password",
                minLength: 8,
                autoComplete: modo === "login" ? "current-password" : "new-password",
                value: formulario.password,
                onChange: valor => actualizar(setFormulario, "password", valor)
            }),
            h(
                "button",
                { type: "submit", disabled: procesando || !backendDisponible },
                procesando ? "Procesando..." : accionModo(modo)
            ),
            modo === "login" && h(
                "button",
                { type: "button", className: "text-button", onClick: () => cambiarModo("recuperar") },
                "Olvide mi contrasena"
            ),
            modo === "recuperar" && h(
                "button",
                { type: "button", className: "text-button", onClick: () => cambiarModo("login") },
                "Volver al inicio de sesion"
            ),
            codigo && h(CodigoSeguro, { codigo }),
            mensaje && h("p", { className: `auth-message ${mensaje.tipo}`, role: "status" }, mensaje.texto)
        )
    );
}

function AccountPanel({ usuario, onAuthChange }) {
    const [sesiones, setSesiones] = useState([]);
    const [actividad, setActividad] = useState([]);
    const [codigo, setCodigo] = useState("");
    const [mensaje, setMensaje] = useState(null);

    const cargar = async () => {
        try {
            const [datosSesiones, datosActividad] = await Promise.all([
                obtenerSesiones(),
                obtenerActividad()
            ]);
            setSesiones(datosSesiones.sesiones);
            setActividad(datosActividad.actividad);
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        }
    };

    useEffect(() => { cargar(); }, []);

    return h(
        "section",
        { className: "auth-page account-page" },
        h("p", { className: "page-eyebrow" }, "Cuenta"),
        h("h1", null, "Seguridad y sesiones"),
        h(
            "div",
            { className: "account-panel" },
            h("strong", null, usuario.nombre),
            usuario.apellido && h("span", null, usuario.apellido),
            h("span", null, usuario.email),
            h("span", null, etiquetaRol(usuario.rol)),
            usuario.legajo && h("span", null, `Legajo ${usuario.legajo}`)
        ),
        h(
            "section",
            { className: "security-section" },
            h("div", { className: "section-heading" },
                h("h2", null, "Sesiones activas"),
                sesiones.length > 1 && h("button", {
                    type: "button",
                    className: "secondary-button",
                    onClick: async () => {
                        const datos = await cerrarOtrasSesiones();
                        setMensaje({ tipo: "success", texto: datos.mensaje });
                        cargar();
                    }
                }, "Cerrar las demas")
            ),
            h("div", { className: "session-list" }, sesiones.map(sesion =>
                h("article", { className: "session-item", key: sesion.id },
                    h("div", null,
                        h("strong", null, sesion.dispositivo),
                        h("span", null, sesion.actual ? "Este dispositivo" : `IP ${sesion.ip}`),
                        h("small", null, `Ultimo uso: ${formatearFecha(sesion.ultimoUso)}`)
                    ),
                    !sesion.actual && h("button", {
                        type: "button",
                        className: "danger-button",
                        onClick: async () => {
                            await cerrarSesionRemota(sesion.id);
                            cargar();
                        }
                    }, "Cerrar")
                )
            ))
        ),
        h(
            "section",
            { className: "security-section" },
            h("h2", null, "Recuperacion"),
            h("p", null, "El codigo permite recuperar la cuenta sin correo. Cada codigo nuevo invalida el anterior."),
            h("button", {
                type: "button",
                className: "secondary-button",
                onClick: async () => {
                    const datos = await regenerarCodigoRecuperacion();
                    setCodigo(datos.recoveryCode);
                }
            }, "Generar codigo nuevo"),
            codigo && h(CodigoSeguro, { codigo })
        ),
        h(
            "section",
            { className: "security-section" },
            h("h2", null, "Actividad reciente"),
            h("div", { className: "activity-list" }, actividad.slice(0, 12).map(item =>
                h("div", { className: "activity-item", key: item._id },
                    h("strong", null, etiquetaActividad(item.tipo)),
                    h("span", null, formatearFecha(item.createdAt))
                )
            ))
        ),
        mensaje && h("p", { className: `auth-message ${mensaje.tipo}` }, mensaje.texto),
        h("button", {
            type: "button",
            className: "danger-button logout-button",
            onClick: async () => {
                await cerrarSesion();
                onAuthChange(null);
                window.location.hash = "#/cuenta";
            }
        }, "Cerrar sesion")
    );
}

function CodigoSeguro({ codigo }) {
    return h("div", { className: "recovery-code" },
        h("strong", null, "Codigo de recuperacion"),
        h("code", null, codigo),
        h("small", null, "Se muestra una sola vez. Guardelo fuera de la aplicacion.")
    );
}

function Tab({ activo, onClick, children }) {
    return h("button", { type: "button", className: activo ? "active" : "", onClick }, children);
}

function CampoAuth({ label, onChange, type = "text", required = true, ...props }) {
    return h("label", null,
        h("span", null, label),
        h("input", { ...props, type, required, onChange: event => onChange(event.target.value) })
    );
}

function actualizar(setFormulario, campo, valor) {
    setFormulario(actual => ({ ...actual, [campo]: valor }));
}

function formularioInicial() {
    return {
        nombre: "",
        apellido: "",
        legajo: "",
        email: "",
        password: "",
        recoveryCode: ""
    };
}

function tituloModo(modo) {
    if (modo === "registro") return "Crear cuenta";
    if (modo === "recuperar") return "Recuperar cuenta";
    return "Iniciar sesion";
}

function accionModo(modo) {
    if (modo === "registro") return "Solicitar cuenta";
    if (modo === "recuperar") return "Cambiar contrasena";
    return "Iniciar sesion";
}

function formatearFecha(fecha) {
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(fecha));
}

function etiquetaActividad(tipo) {
    return String(tipo || "").replaceAll("_", " ").replace(/^\w/, letra => letra.toUpperCase());
}
