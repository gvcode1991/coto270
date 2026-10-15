import { actualizarPerfil } from "../lib/authApi.js";

const { useState } = React;
const h = React.createElement;

export function ProfileEditor({ usuario, onSave, onCancel }) {
    const [datos, setDatos] = useState(() => ({
        nombre: usuario.nombre || "", apellido: usuario.apellido || "",
        email: usuario.email || "", legajo: usuario.legajo || "", passwordActual: ""
    }));
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const cambiaCorreo = datos.email.trim().toLowerCase() !== usuario.email;
    const cambiar = (campo, valor) => setDatos(actual => ({ ...actual, [campo]: valor }));

    const guardar = async event => {
        event.preventDefault();
        if (guardando) return;
        setGuardando(true);
        setError("");
        try {
            const resultado = await actualizarPerfil({ ...datos, passwordActual: cambiaCorreo ? datos.passwordActual : "" });
            if (!resultado.usuario?.id) throw new Error("No se pudo confirmar el guardado del perfil.");
            onSave(resultado);
        } catch (fallo) {
            setError(fallo.message);
            cambiar("passwordActual", "");
        } finally { setGuardando(false); }
    };

    return h("form", { className: "auth-form profile-form", onSubmit: guardar, "aria-label": "Editar datos personales", "aria-busy": guardando },
        h("h2", null, "Editar mis datos"),
        h("fieldset", { disabled: guardando },
            h("legend", { className: "sr-only" }, "Datos personales"),
            h(Campo, { label: "Nombre", value: datos.nombre, minLength: 2, maxLength: 80, autoComplete: "given-name", cambiar: valor => cambiar("nombre", valor) }),
            h(Campo, { label: "Apellido", value: datos.apellido, minLength: 2, maxLength: 80, autoComplete: "family-name", cambiar: valor => cambiar("apellido", valor) }),
            h(Campo, { label: "Legajo (opcional)", value: datos.legajo, maxLength: 20, required: false, cambiar: valor => cambiar("legajo", valor) }),
            h(Campo, { label: "Correo", type: "email", value: datos.email, maxLength: 254, autoComplete: "email", cambiar: valor => cambiar("email", valor) }),
            cambiaCorreo && h(Campo, { label: "Contraseña actual para cambiar el correo", type: "password", value: datos.passwordActual, autoComplete: "current-password", cambiar: valor => cambiar("passwordActual", valor) }),
            h("div", { className: "profile-actions" },
                h("button", { type: "submit" }, guardando ? "Guardando…" : "Guardar mis datos"),
                h("button", { type: "button", className: "secondary-button", onClick: onCancel }, "Cancelar")
            )
        ),
        error && h("p", { className: "auth-message error", role: "alert" }, error)
    );
}

function Campo({ label, cambiar, required = true, ...props }) {
    return h("label", null, h("span", null, label), h("input", { ...props, required, onChange: event => cambiar(event.target.value) }));
}
