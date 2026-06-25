import {
    actualizarAcceso,
    actualizarEstado,
    actualizarRol,
    obtenerActividadGlobal,
    obtenerUsuarios
} from "../lib/adminApi.js";

const { useEffect, useState } = React;
const h = React.createElement;

export function AdminPage({ usuario }) {
    const [usuarios, setUsuarios] = useState([]);
    const [actividad, setActividad] = useState([]);
    const [mensaje, setMensaje] = useState(null);

    const cargar = async () => {
        try {
            const [datosUsuarios, datosActividad] = await Promise.all([
                obtenerUsuarios(),
                obtenerActividadGlobal()
            ]);
            setUsuarios(datosUsuarios.usuarios);
            setActividad(datosActividad.actividad);
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        }
    };

    useEffect(() => { if (usuario?.role === "admin") cargar(); }, [usuario?.role]);

    if (usuario?.role !== "admin") {
        return h("section", { className: "empty-view" },
            h("h1", null, "Acceso restringido"),
            h("p", null, "Esta seccion solo esta disponible para administradores.")
        );
    }

    const ejecutar = async accion => {
        try {
            const datos = await accion();
            setMensaje({ tipo: "success", texto: datos.mensaje });
            await cargar();
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        }
    };

    return h(
        "section",
        { className: "admin-page" },
        h("p", { className: "page-eyebrow" }, "Administracion"),
        h("h1", null, "Usuarios y accesos"),
        h("p", { className: "page-description" }, "Apruebe cuentas nuevas, asigne permisos y revise la actividad de seguridad."),
        mensaje && h("p", { className: `auth-message ${mensaje.tipo}` }, mensaje.texto),
        h("div", { className: "admin-users" }, usuarios.map(item =>
            h("article", { className: "admin-user", key: item._id },
                h("div", { className: "admin-user-info" },
                    h("strong", null, item.nombre),
                    h("span", null, item.email),
                    h("small", null, `${item.legajo ? `Legajo ${item.legajo} · ` : ""}${item.estado}`)
                ),
                h("div", { className: "admin-actions" },
                    item.estado !== "aprobado" && h("button", {
                        type: "button",
                        onClick: () => ejecutar(() => actualizarEstado(item._id, "aprobado"))
                    }, "Aprobar"),
                    item.estado !== "rechazado" && h("button", {
                        type: "button",
                        className: "secondary-button",
                        onClick: () => ejecutar(() => actualizarEstado(item._id, "rechazado"))
                    }, "Rechazar"),
                    h("select", {
                        value: item.role,
                        "aria-label": `Rol de ${item.nombre}`,
                        onChange: event => ejecutar(() => actualizarRol(item._id, event.target.value))
                    },
                        h("option", { value: "usuario" }, "Usuario"),
                        h("option", { value: "admin" }, "Administrador")
                    ),
                    h("button", {
                        type: "button",
                        className: item.activo ? "danger-button" : "secondary-button",
                        onClick: () => ejecutar(() => actualizarAcceso(item._id, !item.activo))
                    }, item.activo ? "Desactivar" : "Activar")
                )
            )
        )),
        h("section", { className: "security-section admin-activity" },
            h("h2", null, "Actividad de seguridad"),
            h("div", { className: "activity-list" }, actividad.slice(0, 30).map(item =>
                h("div", { className: "activity-item", key: item._id },
                    h("div", null,
                        h("strong", null, item.tipo.replaceAll("_", " ")),
                        h("span", null, item.usuario?.email || "Sin usuario")
                    ),
                    h("small", null, new Date(item.createdAt).toLocaleString("es-AR"))
                )
            ))
        )
    );
}
