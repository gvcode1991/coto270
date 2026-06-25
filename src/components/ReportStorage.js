const h = React.createElement;

export function ReportStorage({ estado, usuario, puedeGuardar, guardando, mensaje, onSave }) {
    return h(
        "section",
        { className: "report-storage", "aria-label": "Guardado del reporte" },
        h(
            "div",
            { className: "report-storage-status" },
            h("span", {
                className: `storage-dot${estado.baseDeDatos ? " connected" : ""}`,
                "aria-hidden": "true"
            }),
            h(
                "div",
                null,
                h("strong", null, estado.texto),
                h(
                    "span",
                    null,
                    estado.baseDeDatos
                        ? usuario
                            ? puedeGuardar
                                ? "Puede guardar este reporte en el historial."
                                : "Su rol puede analizar el archivo, pero no guardarlo."
                            : "Inicie sesion para guardar este reporte."
                        : "El ranking y los filtros siguen funcionando en este dispositivo."
                )
            )
        ),
        h(
            "button",
            {
                type: "button",
                className: "save-report-button",
                disabled: !estado.baseDeDatos || !usuario || !puedeGuardar || guardando,
                onClick: onSave
            },
            guardando ? "Guardando..." : "Guardar reporte"
        ),
        mensaje && h("p", { className: `storage-message ${mensaje.tipo}`, role: "status" }, mensaje.texto)
    );
}
