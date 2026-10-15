export async function paginar(modelo, filtro, parametros = {}, { orden, seleccion } = {}) {
    const solicitada = enteroPositivo(parametros.pagina, 1);
    const limite = Math.min(enteroPositivo(parametros.limite, 10), 100);
    const total = await modelo.countDocuments(filtro);
    const totalPaginas = Math.max(1, Math.ceil(total / limite));
    const pagina = Math.min(solicitada, totalPaginas);
    let consulta = modelo.find(filtro).sort(orden).skip((pagina - 1) * limite).limit(limite);
    if (seleccion) consulta = consulta.select(seleccion);
    return { registros: await consulta, paginacion: { pagina, limite, total, totalPaginas } };
}

function enteroPositivo(valor, defecto) {
    if (valor === undefined) return defecto;
    if (!/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor)) || Array.isArray(valor)) {
        const error = new Error("Los parametros de paginacion deben ser enteros positivos.");
        error.status = 400;
        throw error;
    }
    return Number(valor);
}
