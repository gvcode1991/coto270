import { normalizarId, normalizarTexto } from "./text.js";
import { formatearUniKgPorTipo } from "./formatters.js";

export function obtenerTipoUnidad(producto) {
    const texto = normalizarTexto(producto);
    if (/\bUNI\b/.test(texto)) return "uni";
    return "kg";
}

export function formatearUniKg(producto, valor) {
    return formatearUniKgPorTipo(obtenerTipoUnidad(producto), valor);
}

export function calcularTotalesUniKg(lista) {
    return lista.reduce(
        (totales, producto) => {
            const tipo = obtenerTipoUnidad(producto.Producto);
            totales[tipo].uniKg += producto.UniKg;
            totales[tipo].ventaTotal += producto.VentaTotal;
            return totales;
        },
        {
            uni: { uniKg: 0, ventaTotal: 0 },
            kg: { uniKg: 0, ventaTotal: 0 }
        }
    );
}

export function compararProductosRanking(a, b) {
    const diferenciaVenta = b.VentaTotal - a.VentaTotal;
    if (diferenciaVenta !== 0) return diferenciaVenta;

    const diferenciaUnidades = b.UniKg - a.UniKg;
    if (diferenciaUnidades !== 0) return diferenciaUnidades;

    return a.Producto.localeCompare(b.Producto, "es", { sensitivity: "base" });
}

export function compararProductosPorOrden(a, b, orden) {
    if (orden === "venta-asc") {
        const diferenciaVenta = a.VentaTotal - b.VentaTotal;
        if (diferenciaVenta !== 0) return diferenciaVenta;
        return a.UniKg - b.UniKg;
    }

    if (orden === "unidades-asc") {
        const diferenciaUnidades = a.UniKg - b.UniKg;
        if (diferenciaUnidades !== 0) return diferenciaUnidades;
        return a.VentaTotal - b.VentaTotal;
    }

    if (orden === "unidades-desc") {
        const diferenciaUnidades = b.UniKg - a.UniKg;
        if (diferenciaUnidades !== 0) return diferenciaUnidades;
        return b.VentaTotal - a.VentaTotal;
    }

    return compararProductosRanking(a, b);
}

export function agruparProductosPorDto(lista) {
    const grupos = new Map();

    lista.forEach(producto => {
        const dto = obtenerDtoGrupo(producto);

        if (!grupos.has(dto)) {
            grupos.set(dto, {
                dto,
                departamento: obtenerTituloDto(producto, dto),
                ventaTotal: 0,
                productos: []
            });
        }

        const grupo = grupos.get(dto);
        if (grupo.departamento === dto || grupo.departamento === `DTO ${dto}`) {
            grupo.departamento = obtenerTituloDto(producto, dto);
        }
        grupo.ventaTotal += producto.VentaTotal;
        grupo.productos.push(producto);
    });

    return Array.from(grupos.values())
        .map(grupo => ({
            ...grupo,
            productos: grupo.productos.sort(compararProductosRanking)
        }))
        .sort((a, b) => b.ventaTotal - a.ventaTotal);
}

export function esGrupoTotal(grupo) {
    return normalizarTexto(grupo.dto) === "TOTAL" || normalizarTexto(grupo.departamento) === "TOTAL";
}

export function crearIdDto(grupo) {
    return `dto-${normalizarId(grupo.dto || grupo.departamento)}`;
}

export function debeMostrarPagina(pagina, paginaActual, totalPaginas) {
    return (
        pagina === 1 ||
        pagina === totalPaginas ||
        Math.abs(pagina - paginaActual) <= 1
    );
}

function obtenerDtoGrupo(producto) {
    return producto.DTO || producto.Departamento || "Sin DTO";
}

function obtenerTituloDto(producto, dto) {
    const departamento = producto.Departamento || "";

    if (departamento && !pareceProducto(departamento)) {
        return departamento;
    }

    return dto === "Sin DTO" ? dto : `DTO ${dto}`;
}

export function pareceProducto(valor) {
    const texto = String(valor ?? "").trim();
    const normalizado = normalizarTexto(texto);

    if (!/\p{L}/u.test(texto)) return false;
    if (/^\s*\d+/.test(texto)) return true;

    return (
        normalizado.includes(" KGM") ||
        normalizado.includes(" UNI") ||
        normalizado.includes(" GRM") ||
        normalizado.includes(" COTO") ||
        normalizado.includes(" XKG") ||
        normalizado.length > 18
    );
}
