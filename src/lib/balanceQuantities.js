export function normalizarCantidadContada(valor, unidad) {
    if (valor == null || (typeof valor === "string" && !valor.trim())) return null;

    let cantidad;
    if (typeof valor === "number") {
        cantidad = valor;
    } else if (typeof valor === "string" && /^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(valor.trim())) {
        if (unidad === "uni" && /[.,]\d*[1-9]/.test(valor.trim())) {
            throw errorCantidad("Los productos por unidad requieren una cantidad entera.");
        }
        cantidad = Number(valor.trim().replace(",", "."));
    } else {
        throw errorCantidad("Ingrese una cantidad valida, sin separadores de miles ni signos.");
    }

    if (!Number.isFinite(cantidad) || cantidad < 0 || cantidad > Number.MAX_SAFE_INTEGER) {
        throw errorCantidad("La cantidad debe ser un numero finito mayor o igual a cero dentro del rango permitido.");
    }
    if (unidad === "uni" && !Number.isSafeInteger(cantidad)) {
        throw errorCantidad("Los productos por unidad requieren una cantidad entera.");
    }
    return cantidad;
}

export function normalizarCantidadProducto(producto) {
    try {
        return normalizarCantidadContada(producto.CantidadContada, producto.UnidadMedida);
    } catch (error) {
        error.message = `PLU ${producto.PLU} (${producto.Producto}): ${error.message}`;
        throw error;
    }
}

function errorCantidad(mensaje) {
    const error = new Error(mensaje);
    error.status = 400;
    return error;
}
