export const NEGOCIO_PREDETERMINADO = Object.freeze({ nombre: "Elaborados", rubro: "otro", configurado: false });

export const RUBROS = Object.freeze({
    kiosco: "Kiosco",
    almacen: "Almacén",
    minimercado: "Minimercado",
    supermercado: "Supermercado",
    otro: "Otro"
});

export function validarNegocio(datos) {
    const nombre = typeof datos?.nombre === "string" ? datos.nombre.trim() : "";
    const rubro = typeof datos?.rubro === "string" ? datos.rubro : "";
    if (!nombre || nombre.length > 100 || /[\u0000-\u001f\u007f]/.test(nombre)) {
        throw errorNegocio("Ingresá un nombre de comercio de entre 1 y 100 caracteres.");
    }
    if (!Object.hasOwn(RUBROS, rubro)) throw errorNegocio("Seleccioná un rubro válido.");
    return { nombre, rubro };
}

function errorNegocio(mensaje) {
    const error = new Error(mensaje);
    error.status = 400;
    return error;
}
