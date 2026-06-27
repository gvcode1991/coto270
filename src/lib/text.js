export function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

export function contieneLetras(valor) {
    return /[A-Z\u00d1\u00c1\u00c9\u00cd\u00d3\u00da\u00dc]/i.test(String(valor ?? "").normalize("NFC"));
}

export function normalizarId(valor) {
    return normalizarTexto(valor)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "sin-dto";
}
