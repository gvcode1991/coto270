import { esAdmin } from "../lib/permissions.js";
import { guardarNegocio } from "../lib/businessApi.js";
import { RUBROS, validarNegocio } from "../lib/business.js";

const { useEffect, useState } = React;
const h = React.createElement;

export function BusinessPage({ usuario, negocio, backendDisponible, cargando, errorCarga, recargar, onSave }) {
    const [formulario, setFormulario] = useState({ nombre: negocio.nombre, rubro: negocio.rubro });
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    useEffect(() => {
        setFormulario({ nombre: negocio.nombre, rubro: negocio.rubro });
    }, [negocio.nombre, negocio.rubro]);

    if (!esAdmin(usuario)) {
        return h("section", { className: "empty-view" }, h("h1", null, "Acceso restringido"), h("p", null, "Solo un administrador puede editar el negocio."));
    }

    const guardar = async event => {
        event.preventDefault();
        if (!backendDisponible || cargando || errorCarga || guardando) return;
        setMensaje(null);
        setGuardando(true);
        try {
            const datos = await guardarNegocio(validarNegocio(formulario));
            onSave(datos.negocio);
            setMensaje({ tipo: "success", texto: datos.mensaje });
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        } finally { setGuardando(false); }
    };

    return h("section", { className: "business-page" },
        h("div", { className: "page-heading" }, h("div", null, h("p", { className: "page-eyebrow" }, "Configuración"), h("h1", null, "Tu negocio"))),
        h("p", { className: "page-description" }, "Personalizá el nombre de tu comercio. El rubro es descriptivo: no cambia tus productos, balances ni cálculos."),
        cargando && h("p", { role: "status" }, "Cargando los datos del negocio…"),
        errorCarga && h("div", { className: "auth-message error", role: "alert" },
            h("p", null, errorCarga), h("button", { type: "button", className: "secondary-button", onClick: recargar }, "Volver a intentar")),
        !backendDisponible && h("p", { className: "auth-message error", role: "status" }, "El servidor no está disponible para guardar la configuración."),
        h("form", { className: "business-form", onSubmit: guardar },
            h("fieldset", { disabled: guardando || cargando || !backendDisponible || Boolean(errorCarga) },
                h("legend", { className: "sr-only" }, "Datos del comercio"),
                h("label", null, h("span", null, "Nombre del comercio"), h("input", {
                    value: formulario.nombre, required: true, maxLength: 100, autoComplete: "organization",
                    onChange: event => setFormulario(actual => ({ ...actual, nombre: event.target.value }))
                })),
                h("label", null, h("span", null, "Rubro"), h("select", {
                    "aria-label": "Rubro",
                    value: formulario.rubro,
                    onChange: event => setFormulario(actual => ({ ...actual, rubro: event.target.value }))
                }, Object.entries(RUBROS).map(([valor, nombre]) => h("option", { key: valor, value: valor }, nombre)))),
                h("button", { type: "submit" }, guardando ? "Guardando…" : "Guardar cambios")
            )
        ),
        mensaje && h("p", { className: `auth-message ${mensaje.tipo}`, role: "status" }, mensaje.texto)
    );
}
