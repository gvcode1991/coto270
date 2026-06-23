export const formatoNumero = new Intl.NumberFormat("es-AR", {
    useGrouping: false,
    maximumFractionDigits: 2
});

export const formatoKg = new Intl.NumberFormat("es-AR", {
    useGrouping: true,
    maximumFractionDigits: 2
});

export const formatoMoneda = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
});

export function formatearUniKgPorTipo(tipo, valor) {
    return tipo === "kg" ? formatoKg.format(valor) : formatoNumero.format(valor);
}
