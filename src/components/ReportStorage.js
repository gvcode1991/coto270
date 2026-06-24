const h = React.createElement;

export function ReportStorage({ estado, guardando, mensaje, onSave }) {
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
                        ? "Puede guardar este reporte en el historial."
                        : "El ranking y los filtros siguen funcionando en este dispositivo."
                )
            )
        ),
        h(
            "button",
            {
                type: "button",
                className: "save-report-button",
                disabled: !estado.baseDeDatos || guardando,
                onClick: onSave
            },
            guardando ? "Guardando..." : "Guardar reporte"
        ),
        mensaje && h("p", { className: `storage-message ${mensaje.tipo}`, role: "status" }, mensaje.texto)
    );
}
