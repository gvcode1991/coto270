import {
    actualizarAcceso,
    actualizarEstado,
    actualizarRol,
    eliminarUsuario,
    limpiarRegistros,
    obtenerActividadGlobal,
    obtenerUsuarios
} from "../lib/adminApi.js";
import { esAdmin, etiquetaRol, puedeVerUsuarios } from "../lib/permissions.js";
import { Pagination } from "./Pagination.js";

const { useEffect, useState } = React;
const h = React.createElement;

export function AdminPage({ usuario }) {
    const [usuarios, setUsuarios] = useState([]);
    const [actividad, setActividad] = useState([]);
    const [mensaje, setMensaje] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [paginacion, setPaginacion] = useState({ total: 0, totalPaginas: 1 });
    const [revision, setRevision] = useState(0);
    const [procesando, setProcesando] = useState(false);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (!puedeVerUsuarios(usuario)) return;
        let vigente = true;
        setCargando(true);
        Promise.all([obtenerUsuarios(), obtenerActividadGlobal(pagina)])
            .then(([datosUsuarios, datosActividad]) => {
                if (!vigente) return;
                setUsuarios(datosUsuarios.usuarios);
                setActividad(datosActividad.actividad);
                setPaginacion(datosActividad.paginacion);
                setPagina(datosActividad.paginacion.pagina);
            })
            .catch(error => { if (vigente) setMensaje({ tipo: "error", texto: error.message }); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [usuario && usuario.id, usuario && usuario.rol, pagina, revision]);

    if (!puedeVerUsuarios(usuario)) {
        return h("section", { className: "empty-view" },
            h("h1", null, "Acceso restringido"),
            h("p", null, "Esta seccion esta disponible para administradores y gerentes.")
        );
    }

    const permiteEditar = esAdmin(usuario);
    const ejecutar = async (accion, reiniciarPagina = false) => {
        if (procesando) return;
        setProcesando(true);
        setMensaje(null);
        try {
            const datos = await accion();
            setMensaje({ tipo: "success", texto: datos.mensaje });
            if (reiniciarPagina) setPagina(1);
            setRevision(actual => actual + 1);
        } catch (error) {
            setMensaje({ tipo: "error", texto: error.message });
        } finally {
            setProcesando(false);
        }
    };

    const borrarUsuario = item => {
        if (window.confirm(`Eliminar la cuenta de ${item.email}? Se cerraran sus sesiones. Esta accion no se puede deshacer.`)) {
            ejecutar(() => eliminarUsuario(item._id));
        }
    };

    const limpiarActividad = () => {
        if (window.confirm("Eliminar todos los registros de actividad de todos los usuarios? Esta accion no se puede deshacer.")) {
            ejecutar(limpiarRegistros, true);
        }
    };

    return h(
        "section",
        { className: "admin-page" },
        h("p", { className: "page-eyebrow" }, permiteEditar ? "Administracion" : "Consulta"),
        h("h1", null, "Usuarios y accesos"),
        h("p", { className: "page-description" },
            permiteEditar
                ? "Apruebe cuentas, asigne roles y revise la actividad de seguridad."
                : "Consulte los usuarios registrados y la actividad de seguridad."
        ),
        mensaje && h("p", { className: `auth-message ${mensaje.tipo}`, role: "status" }, mensaje.texto),
        h("div", { className: "admin-users" }, usuarios.map(item =>
            h("article", { className: "admin-user", key: item._id },
                h("div", { className: "admin-user-info" },
                    h("strong", null, `${item.nombre} ${item.apellido || ""}`.trim()),
                    h("span", null, item.email),
                    h("small", null,
                        `${item.legajo ? `Legajo ${item.legajo} · ` : ""}${etiquetaRol(item.rol)} · ${item.estado}`
                    )
                ),
                permiteEditar && h("div", { className: "admin-actions" },
                    item.estado !== "aprobado" && h("button", {
                        type: "button",
                        disabled: procesando,
                        onClick: () => ejecutar(() => actualizarEstado(item._id, "aprobado"))
                    }, "Aprobar"),
                    item.estado !== "rechazado" && h("button", {
                        type: "button",
                        disabled: procesando,
                        className: "secondary-button",
                        onClick: () => ejecutar(() => actualizarEstado(item._id, "rechazado"))
                    }, "Rechazar"),
                    h("select", {
                        disabled: procesando,
                        value: item.rol,
                        "aria-label": `Rol de ${item.nombre}`,
                        onChange: event => ejecutar(() => actualizarRol(item._id, event.target.value))
                    },
                        h("option", { value: "operador" }, "Operador"),
                        h("option", { value: "referente" }, "Referente"),
                        h("option", { value: "gerente" }, "Gerente"),
                        h("option", { value: "admin" }, "Administrador")
                    ),
                    h("button", {
                        type: "button",
                        disabled: procesando,
                        className: item.activo ? "danger-button" : "secondary-button",
                        onClick: () => ejecutar(() => actualizarAcceso(item._id, !item.activo))
                    }, item.activo ? "Desactivar" : "Activar"),
                    item.rol !== "admin" && item._id !== usuario.id && h("button", {
                        type: "button",
                        className: "danger-button",
                        disabled: procesando,
                        "aria-label": `Eliminar usuario ${item.email}`,
                        onClick: () => borrarUsuario(item)
                    }, "Eliminar usuario")
                )
            )
        )),
        h("section", { className: "security-section admin-activity" },
            h("div", { className: "section-heading" },
                h("h2", null, "Actividad de seguridad"),
                h("span", { className: "result-count" }, `${paginacion.total} registros`),
                permiteEditar && h("button", {
                    type: "button",
                    className: "danger-button",
                    disabled: procesando || cargando || !paginacion.total,
                    onClick: limpiarActividad
                }, "Limpiar registros")
            ),
            cargando ? h("p", { role: "status" }, "Cargando actividad...") : h("div", { className: "activity-list" }, actividad.map(item =>
                h("div", { className: "activity-item", key: item._id },
                    h("div", null,
                        h("strong", null, String(item.tipo || "").replace(/_/g, " ")),
                        h("span", null, item.usuario && item.usuario.email ? item.usuario.email : "Sin usuario"),
                        item.detalle && h("small", null, item.detalle)
                    ),
                    h("small", null, formatearFechaSimple(item.createdAt))
                )
            )),
            !cargando && !actividad.length && h("p", { className: "empty-period" }, "No hay registros de actividad."),
            h(Pagination, { totalPaginas: paginacion.totalPaginas, paginaActual: pagina, cambiarPagina: setPagina, disabled: cargando || procesando })
        )
    );
}

function formatearFechaSimple(fecha) {
    const valor = new Date(fecha);
    if (!Number.isFinite(valor.getTime())) return "Sin fecha registrada";

    const dia = String(valor.getDate()).padStart(2, "0");
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const anio = valor.getFullYear();
    const hora = String(valor.getHours()).padStart(2, "0");
    const minutos = String(valor.getMinutes()).padStart(2, "0");

    return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
}
