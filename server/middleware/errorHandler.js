export function manejarErrores(error, req, res, next) {
    console.error(error);

    if (res.headersSent) return next(error);

    const estado = error.status || (error.name === "ValidationError" ? 400 : 500);
    return res.status(estado).json({
        mensaje: estado === 500
            ? "Ocurrio un error al procesar la solicitud."
            : error.message
    });
}
