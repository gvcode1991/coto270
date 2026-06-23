const h = React.createElement;

export function Footer() {
    return h(
        "footer",
        { className: "site-footer" },
        h("p", null, "Copyright 2026 Pulso de Ventas. Aplicacion creada por Gabriel Villamayor."),
        h("p", null, "Legajo Coto 198551. Sector Elaborados. Puesto Postulante."),
        h(
            "p",
            null,
            "Uso interno. La informacion generada esta sujeta a validacion comercial y a los terminos legales de la empresa."
        )
    );
}
