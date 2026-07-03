const h = React.createElement;

export function Footer() {
    return h(
        "footer",
        { className: "site-footer" },
        h("p", null, "Copyright 2026 Pulso de Ventas. Todos los derechos reservados."),
        h(
            "a",
            {
                className: "footer-brand",
                href: "https://res.cloudinary.com/dwifi7niu/image/upload/v1783051354/logoSF_zva2f0.png",
                target: "_blank",
                rel: "noreferrer"
            },
            h("span", null, "Powered by"),
            h("img", {
                src: "https://res.cloudinary.com/dwifi7niu/image/upload/v1783051354/logoSF_zva2f0.png",
                alt: "VillamayorLabs"
            })
        )
    );
}
