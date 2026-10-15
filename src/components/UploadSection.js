const { useState } = React;
const h = React.createElement;

export function UploadSection({ onGenerate, negocio }) {
    const [archivo, setArchivo] = useState(null);

    return h(
        "section",
        { id: "carga", className: "tool-section" },
        h(
            "div",
            { className: "app-hero" },
            h("img", {
                className: "app-hero-logo",
                src: "assets/images/pulso-de-ventas-logo.png",
                alt: "Pulso de Ventas"
            }),
            h("div", null,
                h("p", { className: "page-eyebrow" }, "Pulso de Ventas"),
                h("h1", null, "Analizá tus ventas"),
                h("p", { className: "app-hero-description" }, `Cargá la planilla de ventas de ${negocio.nombre} para consultar productos y departamentos.`)
            )
        ),
        h(
            "div",
            { className: "upload-panel" },
            h("label", { htmlFor: "archivo" }, "Archivo de ventas"),
            h("p", { id: "archivo-ayuda", className: "field-hint" }, "Usá una planilla Excel u ODS con el formato de ventas actual. Después de generar el ranking podés filtrar por fecha, unidad o kilo."),
            h("input", {
                type: "file",
                id: "archivo",
                accept: ".xlsx,.xls,.ods",
                "aria-describedby": "archivo-ayuda",
                onChange: event => setArchivo(event.target.files[0] || null)
            }),
            h(
                "button",
                { id: "generarRanking", type: "button", onClick: () => onGenerate(archivo) },
                h("span", null, "Generar ranking")
            )
        )
    );
}
