import { pareceProducto } from "./products.js";
import { normalizarTexto } from "./text.js";

export function obtenerProductosBalance(filas) {
    const columnas = detectarColumnasBalance(filas);
    let departamentoActual = "";
    let dtoActual = "";
    const productos = new Map();

    filas.forEach((fila, indice) => {
        if (indice <= columnas.filaEncabezado) return;

        const celdas = fila.map(valor => String(valor ?? "").trim());
        if (!celdas.some(Boolean)) return;

        const departamentoCelda = obtenerValor(celdas, columnas.departamento);
        const productoCelda = obtenerValor(celdas, columnas.producto);

        if (esDepartamentoBalance(departamentoCelda, productoCelda)) {
            departamentoActual = limpiarDepartamento(departamentoCelda);
            dtoActual = extraerDto(departamentoCelda);
            return;
        }

        const productoDetectado = obtenerProducto(celdas, columnas.producto);
        const producto = productoDetectado.producto;
        const plu = obtenerValor(celdas, columnas.plu) || productoDetectado.plu;

        if (!esProductoImportable(plu, producto)) return;

        const departamentoRaw = departamentoCelda || departamentoActual;
        const departamento =
            limpiarDepartamento(departamentoRaw) ||
            departamentoActual ||
            obtenerValor(celdas, columnas.dto) ||
            "Sin departamento";
        const dto = extraerDto(departamentoRaw) || obtenerValor(celdas, columnas.dto) || dtoActual;
        const unidad = normalizarUnidad(obtenerValor(celdas, columnas.unidad), producto);
        const cantidad = obtenerCantidad(celdas, columnas.cantidad);

        productos.set(plu, {
            PLU: plu,
            Producto: producto,
            DTO: dto,
            Departamento: departamento,
            UnidadMedida: unidad,
            CantidadContada: cantidad
        });
    });

    return Array.from(productos.values()).sort((a, b) =>
        a.Producto.localeCompare(b.Producto, "es", { sensitivity: "base" })
    );
}

function detectarColumnasBalance(filas) {
    const filaEncabezado = encontrarFilaEncabezado(filas);
    const encabezados = filaEncabezado === -1 ? [] : filas[filaEncabezado].map(normalizarTexto);
    const columnasDetectadas = {
        filaEncabezado,
        plu: encontrarColumna(encabezados, esColumnaPlu, null),
        producto: encontrarColumna(encabezados, esColumnaProducto, null),
        departamento: encontrarColumna(encabezados, esColumnaDepartamento, null),
        dto: encontrarColumna(encabezados, encabezado => encabezado === "DTO", null),
        unidad: encontrarColumna(encabezados, esColumnaUnidad, null),
        cantidad: encontrarColumna(encabezados, esColumnaCantidad, null)
    };

    if (columnasDetectadas.plu !== null && columnasDetectadas.producto !== null) {
        return columnasDetectadas;
    }

    return ajustarColumnasPorContenido(columnasDetectadas, filas);
}

function encontrarFilaEncabezado(filas) {
    let mejorIndice = -1;
    let mejorPuntaje = 0;

    filas.forEach((fila, indice) => {
        const puntaje = fila.map(normalizarTexto).reduce((total, encabezado) => {
            if (esColumnaPlu(encabezado)) return total + 2;
            if (esColumnaProducto(encabezado)) return total + 2;
            if (esColumnaDepartamento(encabezado)) return total + 1;
            if (esColumnaUnidad(encabezado)) return total + 1;
            if (esColumnaCantidad(encabezado)) return total + 1;
            return total;
        }, 0);

        if (puntaje > mejorPuntaje) {
            mejorPuntaje = puntaje;
            mejorIndice = indice;
        }
    });

    return mejorPuntaje >= 3 ? mejorIndice : -1;
}

function ajustarColumnasPorContenido(columnas, filas) {
    const filasDatos = filas
        .filter((fila, indice) => indice !== columnas.filaEncabezado && fila.some(celda => celda !== ""))
        .slice(0, 40);
    const maxColumnas = Math.max(0, ...filasDatos.map(fila => fila.length));
    const puntajes = Array.from({ length: maxColumnas }, (_, indice) => ({
        indice,
        plu: 0,
        producto: 0,
        cantidad: 0
    }));

    filasDatos.forEach(fila => {
        fila.forEach((celda, indice) => {
            const texto = String(celda ?? "").trim();
            if (!texto) return;
            if (/^\d{3,}$/.test(texto)) puntajes[indice].plu += 1;
            if (pareceProducto(texto)) puntajes[indice].producto += 1;
            if (parsearNumero(texto) > 0) puntajes[indice].cantidad += 1;
        });
    });

    const plu = columnas.plu ?? mejorColumna(puntajes, "plu");
    const producto = columnas.producto ?? mejorColumna(puntajes.filter(item => item.indice !== plu), "producto");
    const cantidad = columnas.cantidad ?? mejorColumna(puntajes.filter(item => item.indice !== plu && item.indice !== producto), "cantidad");

    return {
        ...columnas,
        filaEncabezado: columnas.filaEncabezado,
        plu,
        producto,
        cantidad
    };
}

function mejorColumna(puntajes, campo) {
    const mejor = puntajes
        .filter(item => item[campo] > 0)
        .sort((a, b) => b[campo] - a[campo])[0];

    return mejor ? mejor.indice : null;
}

function encontrarColumna(encabezados, evaluador, fallback) {
    const indice = encabezados.findIndex(evaluador);
    return indice === -1 ? fallback : indice;
}

function esColumnaPlu(encabezado) {
    return encabezado === "PLU" || encabezado.includes("CODIGO");
}

function esColumnaProducto(encabezado) {
    return encabezado.includes("PRODUCTO") || encabezado.includes("DESCRIPCION") || encabezado.includes("ARTICULO");
}

function esColumnaDepartamento(encabezado) {
    return encabezado.includes("DEPARTAMENTO") || encabezado.includes("DEPTO") || encabezado.includes("DPTO") || encabezado.includes("SECTOR");
}

function esColumnaUnidad(encabezado) {
    return encabezado.includes("UNIDAD") || encabezado.includes("MEDIDA") || encabezado === "TIPO";
}

function esColumnaCantidad(encabezado) {
    return encabezado.includes("CANTIDAD") || encabezado.includes("CONTEO") || encabezado.includes("STOCK") || encabezado.includes("BALANCE");
}

function obtenerValor(fila, columna) {
    if (columna === null || columna === undefined) return "";
    return String(fila[columna] ?? "").trim();
}

function obtenerProducto(fila, columnaProducto) {
    const texto = obtenerValor(fila, columnaProducto);
    const separado = separarPluProducto(texto);

    if (separado.producto) return separado;

    const candidato = fila
        .map(textoCelda => separarPluProducto(textoCelda))
        .filter(item => item.producto && pareceProducto(item.producto))
        .sort((a, b) => b.producto.length - a.producto.length)[0];

    return candidato || { plu: "", producto: "" };
}

function separarPluProducto(valor) {
    const texto = String(valor ?? "").trim();
    const partes = texto.match(/^(\d{3,})\s*[-./]?\s*(.*)$/);

    if (!partes) return { plu: "", producto: texto };
    return { plu: partes[1], producto: partes[2].trim() };
}

function esDepartamentoBalance(departamento, producto) {
    const texto = normalizarTexto(departamento);
    if (!texto || (producto && pareceProducto(producto))) return false;
    if (texto === "DEPARTAMENTO" || texto === "TOTAL") return false;
    return /\p{L}/u.test(departamento) && !/\b(UNI|KGM|GRM|XKG)\b/.test(texto);
}

function limpiarDepartamento(valor) {
    return String(valor ?? "")
        .trim()
        .replace(/^\d+\s+/, "");
}

function extraerDto(departamento) {
    const partes = String(departamento ?? "").trim().match(/^(\d+)/);
    return partes ? partes[1] : "";
}

function normalizarUnidad(valor, producto) {
    const texto = normalizarTexto(valor);
    if (texto.includes("KG") || texto.includes("KILO")) return "kg";
    if (texto.includes("UNI") || texto.includes("UNIDAD")) return "uni";
    return /\bUNI\b/i.test(producto) ? "uni" : "kg";
}

function obtenerCantidad(fila, columna) {
    const numero = parsearNumero(obtenerValor(fila, columna));
    return numero > 0 ? String(numero) : "";
}

function esProductoImportable(plu, producto) {
    const productoNormalizado = normalizarTexto(producto);
    if (!plu || !producto || !pareceProducto(producto)) return false;
    if (["PRODUCTO", "DESCRIPCION", "TOTAL"].includes(productoNormalizado)) return false;

    return ![
        /^AJUSTE\b/,
        /^AJUSTES\b/,
        /^DIFERENCIA\b/,
        /^DIFERENCIAS\b/,
        /^MERMA\b/,
        /^MERMAS\b/,
        /^TOTAL\b/
    ].some(patron => patron.test(productoNormalizado));
}

function parsearNumero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (valor === null || valor === undefined) return 0;

    let texto = String(valor).trim();
    if (!texto || /\p{L}/u.test(texto)) return 0;

    texto = texto.replace(/[^\d,.-]/g, "");
    if (!texto || texto === "-" || texto === "," || texto === ".") return 0;

    const ultimaComa = texto.lastIndexOf(",");
    const ultimoPunto = texto.lastIndexOf(".");

    if (ultimaComa !== -1 && ultimoPunto !== -1) {
        const separadorDecimal = ultimaComa > ultimoPunto ? "," : ".";
        const separadorMiles = separadorDecimal === "," ? "." : ",";
        texto = texto.replace(new RegExp(`\\${separadorMiles}`, "g"), "");
        texto = texto.replace(separadorDecimal, ".");
    } else if (ultimaComa !== -1) {
        texto = texto.replace(/\./g, "").replace(",", ".");
    } else {
        texto = texto.replace(/,/g, "");
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
}
