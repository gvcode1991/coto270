export function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

export function contieneLetras(valor) {
    return /\p{L}/u.test(String(valor ?? ""));
}

export function normalizarId(valor) {
    return normalizarTexto(valor)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "sin-dto";
}
