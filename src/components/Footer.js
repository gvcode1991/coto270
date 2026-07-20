const h = React.createElement;

export function Footer() {
    return h(
        "footer",
        { className: "site-footer" },
        h("p", null, "Copyright 2026 Pulso de Ventas. Todos los derechos reservados."),
        h(
            "div",
            { className: "footer-brand", "aria-label": "Powered by VillamayorLabs" },
            h("span", null, "Powered by"),
            h("img", {
                src: "https://res.cloudinary.com/dwifi7niu/image/upload/v1783051354/logoSF_zva2f0.png",
                alt: "VillamayorLabs",
                loading: "lazy"
            })
        )
    );
}
