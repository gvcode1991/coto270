const { useState } = React;
const h = React.createElement;

export function UploadSection({ onGenerate }) {
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
            h(
                "p",
                { className: "app-hero-description" },
                "Analiza ventas semanales, separa productos por unidad y kilo, y genera rankings por departamento para el sector Elaborados."
            )
        ),
        h(
            "div",
            { className: "upload-panel" },
            h("label", { htmlFor: "archivo" }, "Archivo de ventas"),
            h("input", {
                type: "file",
                id: "archivo",
                accept: ".xlsx,.xls,.ods",
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
