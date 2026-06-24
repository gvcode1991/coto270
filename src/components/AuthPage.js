import {
    cerrarSesion,
    iniciarSesion,
    registrarUsuario
} from "../lib/authApi.js";

const { useState } = React;
const h = React.createElement;

export function AuthPage({ usuario, onAuthChange, backendDisponible }) {
    const [modo, setModo] = useState("login");
    const [formulario, setFormulario] = useState({
        nombre: "",
        legajo: "",
        email: "",
        password: ""
    });
    const [mensaje, setMensaje] = useState(null);
    const [procesando, setProcesando] = useState(false);

    if (usuario) {
        return h(
            "section",
            { className: "auth-page" },
            h("p", { className: "page-eyebrow" }, "Cuenta"),
            h("h1", null, "Sesion activa"),
            h(
                "div",
                { className: "account-panel" },
                h("strong", null, usuario.nombre),
                h("span", null, usuario.email),
                usuario.legajo && h("span", null, `Legajo ${usuario.legajo}`),
                h(
                    "button",
                    {
                        type: "button",
                        className: "secondary-button",
                        onClick: async () => {
                            await cerrarSesion();
                            onAuthChange(null);
                        }
                    },
                    "Cerrar sesion"
                )
            )
        );
    }

    const enviar = async event => {
        event.preventDefault();
        if (!backendDisponible) {
            setMensaje({ tipo: "error", texto: "El servidor de usuarios no esta disponible." });
            return;
        }

        setProcesando(true);
        setMensaje(null);
        try {
            const accion = modo === "registro" ? registrarUsuario : iniciarSesion;
            const datos = await accion(formulario);
            onAuthChange(datos.usuario);
            setMensaje({ tipo: "success", texto: datos.mensaje });
            window.location.hash = "#/carga";
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        } finally {
            setProcesando(false);
        }
    };

    return h(
        "section",
        { className: "auth-page" },
        h(
            "div",
            { className: "auth-brand" },
            h("img", {
                src: "assets/images/pulso-de-ventas-logo.png",
                alt: "Pulso de Ventas"
            }),
            h(
                "p",
                null,
                "Analiza ventas semanales, prepara balances mensuales y compara resultados por producto y departamento."
            )
        ),
        h("p", { className: "page-eyebrow" }, "Acceso"),
        h("h1", null, modo === "registro" ? "Crear cuenta" : "Iniciar sesion"),
        h(
            "div",
            { className: "auth-tabs", role: "tablist", "aria-label": "Acceso de usuarios" },
            h(
                "button",
                {
                    type: "button",
                    className: modo === "login" ? "active" : "",
                    onClick: () => setModo("login")
                },
                "Ingresar"
            ),
            h(
                "button",
                {
                    type: "button",
                    className: modo === "registro" ? "active" : "",
                    onClick: () => setModo("registro")
                },
                "Registrarse"
            )
        ),
        h(
            "form",
            { className: "auth-form", onSubmit: enviar },
            modo === "registro" &&
                h(CampoAuth, {
                    label: "Nombre",
                    autoComplete: "name",
                    value: formulario.nombre,
                    onChange: valor => setFormulario(actual => ({ ...actual, nombre: valor }))
                }),
            modo === "registro" &&
                h(CampoAuth, {
                    label: "Legajo (opcional)",
                    inputMode: "numeric",
                    value: formulario.legajo,
                    onChange: valor => setFormulario(actual => ({ ...actual, legajo: valor }))
                }),
            h(CampoAuth, {
                label: "Correo",
                type: "email",
                autoComplete: "email",
                value: formulario.email,
                onChange: valor => setFormulario(actual => ({ ...actual, email: valor }))
            }),
            h(CampoAuth, {
                label: "Contraseña",
                type: "password",
                minLength: 8,
                autoComplete: modo === "registro" ? "new-password" : "current-password",
                value: formulario.password,
                onChange: valor => setFormulario(actual => ({ ...actual, password: valor }))
            }),
            h(
                "button",
                { type: "submit", disabled: procesando || !backendDisponible },
                procesando ? "Procesando..." : modo === "registro" ? "Crear cuenta" : "Iniciar sesion"
            ),
            mensaje && h("p", { className: `auth-message ${mensaje.tipo}`, role: "status" }, mensaje.texto)
        )
    );
}

function CampoAuth({ label, onChange, type = "text", ...props }) {
    return h(
        "label",
        null,
        h("span", null, label),
        h("input", {
            ...props,
            type,
            required: label !== "Legajo (opcional)",
            onChange: event => onChange(event.target.value)
        })
    );
}
