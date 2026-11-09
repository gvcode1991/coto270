export function abrirBalanceGuardado(balance) {
    return {
        id: balance._id || "",
        fecha: balance.fecha,
        tipo: balance.tipo,
        estado: balance.estado,
        productos: (balance.productos || []).map(item => ({
            PLU: item.PLU,
            Producto: item.Producto,
            DTO: item.DTO || "",
            Departamento: item.Departamento,
            UnidadMedida: item.UnidadMedida,
            Categoria: item.Categoria || "producto-final",
            CantidadContada: item.CantidadContada == null ? "" : item.CantidadContada
        }))
    };
}

export function crearProductosDesdeInventario(inventario) {
    return inventario
        .map(item => ({
            PLU: String(item.PLU || "").trim(),
            Producto: String(item.Producto || "").trim(),
            DTO: String(item.DTO || "").trim(),
            Departamento: String(item.Departamento || "").trim(),
            UnidadMedida: item.UnidadMedida === "uni" ? "uni" : "kg",
            Categoria: item.Categoria === "materia-prima" ? "materia-prima" : "producto-final",
            CantidadContada: ""
        }))
        .filter(item => item.PLU && item.Producto && item.Departamento)
        .sort((a, b) => a.Producto.localeCompare(b.Producto, "es", { sensitivity: "base" }));
}

export function agregarProductosDelInventario(inventario, productosBalance) {
    const plusExistentes = new Set(productosBalance.map(item => item.PLU));
    const nuevos = crearProductosDesdeInventario(inventario).filter(item => {
        if (plusExistentes.has(item.PLU)) return false;
        plusExistentes.add(item.PLU);
        return true;
    });

    return [...productosBalance.map(item => ({ ...item })), ...nuevos];
}
