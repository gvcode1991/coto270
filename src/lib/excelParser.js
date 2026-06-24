import { COLUMNAS_FALLBACK } from "../constants.js";
import { contieneLetras, normalizarTexto } from "./text.js";
import { pareceProducto } from "./products.js";

export function obtenerProductos(filas) {
    const columnas = detectarColumnas(filas);
    let departamentoActual = "";

    return filas.reduce((resultado, fila, indice) => {
        if (indice <= columnas.filaEncabezado) return resultado;

        const departamentoCelda = String(fila[columnas.departamento] ?? "").trim();
        const plu = String(fila[columnas.plu] ?? "").trim();
        const productoOriginal = String(fila[columnas.producto] ?? "").trim();
        const producto = separarPluProducto(productoOriginal).producto || encontrarProductoEnFila(fila);

        if (esFilaResumen(plu, producto, departamentoCelda)) return resultado;

        if (esDepartamentoValido(departamentoCelda)) {
            departamentoActual = departamentoCelda;
        }

        const dto = extraerDto(departamentoActual);
        const departamento = limpiarDepartamento(departamentoActual);
        const productoNormalizado = normalizarTexto(producto);

        if (!plu && !producto) return resultado;
        if (productoNormalizado === "DESCRIPCION" || productoNormalizado === "PRODUCTO") return resultado;
        if (!esProductoValido(producto)) return resultado;

        const indiceProductoFila = encontrarIndiceProductoFila(fila, producto, columnas.producto);
        const totalesFila = sumarParesVentaFila(fila, indiceProductoFila, columnas);
        const uniKg = totalesFila.uniKg;
        const ventaCalculada = totalesFila.ventaTotal;
        const ventaTotal = normalizarVentaTotal(ventaCalculada, uniKg);

        if (ventaCalculada !== 0 || uniKg > 0) {
            resultado.push({
                PLU: plu,
                Producto: producto,
                DTO: dto,
                Departamento: departamento,
                UniKg: uniKg,
                VentaTotal: ventaTotal,
                VentaOriginal: ventaCalculada,
                VentasPorFecha: totalesFila.ventasPorFecha
            });
        }

        return resultado;
    }, []);
}

function detectarColumnas(filas) {
    const filaDepartamento = filas.findIndex(fila =>
        fila.some(celda => normalizarTexto(celda) === "DEPARTAMENTO")
    );
    const filaSubencabezado = filas.findIndex(fila =>
        fila.some(celda => esColumnaUniKg(normalizarTexto(celda))) ||
        fila.some(celda => esColumnaVenta(normalizarTexto(celda)))
    );

    if (filaDepartamento !== -1) {
        const encabezados = filas[filaDepartamento].map(normalizarTexto);
        const subencabezados = filaSubencabezado === -1 ? [] : filas[filaSubencabezado].map(normalizarTexto);
        const departamento = encontrarColumna(encabezados, esColumnaDepartamento, 0);
        const columnaPlu = encontrarColumna(encabezados, esColumnaPlu, null);
        const columnaProducto = encontrarColumna(encabezados, esColumnaProducto, 1);
        const plu = columnaPlu ?? columnaProducto;
        const producto = columnaPlu === null ? plu + 1 : columnaProducto;
        const uniKg = [];
        const ventaTotal = [];

        subencabezados.forEach((encabezado, indice) => {
            if (indice <= producto) return;
            if (esColumnaUniKg(encabezado)) uniKg.push(indice);
            if (esColumnaVenta(encabezado)) ventaTotal.push(indice);
        });

        const columnasPorPares = detectarParesVentaPorDatos(filas, filaSubencabezado, producto);
        reemplazarSiTieneDatos(uniKg, columnasPorPares.uniKg);
        reemplazarSiTieneDatos(ventaTotal, columnasPorPares.ventaTotal);
        const columnasUniKg = uniKg.length ? uniKg : COLUMNAS_FALLBACK.uniKg;

        return {
            filaEncabezado: filaSubencabezado === -1 ? filaDepartamento : filaSubencabezado,
            dto: departamento,
            departamento,
            plu,
            producto,
            uniKg: columnasUniKg,
            ventaTotal,
            fechasPorColumna: detectarFechasPorColumna(filas, filaSubencabezado, columnasUniKg)
        };
    }

    const filaEncabezado = encontrarFilaEncabezado(filas);

    if (filaEncabezado === -1) {
        return {
            ...ajustarColumnasPorContenido({ ...COLUMNAS_FALLBACK, ventaTotal: [], filaEncabezado: -1 }, filas),
            fechasPorColumna: {}
        };
    }

    const encabezados = filas[filaEncabezado].map(normalizarTexto);
    const uniKg = [];
    const ventaTotal = [];

    encabezados.forEach((encabezado, indice) => {
        if (indice <= COLUMNAS_FALLBACK.producto) return;
        if (esColumnaUniKg(encabezado)) uniKg.push(indice);
        if (esColumnaVenta(encabezado)) ventaTotal.push(indice);
    });

    const columnasAjustadas = ajustarColumnasPorContenido({
        filaEncabezado,
        dto: encontrarColumna(encabezados, esColumnaDto, COLUMNAS_FALLBACK.dto),
        departamento: encontrarColumna(encabezados, esColumnaDepartamento, COLUMNAS_FALLBACK.departamento),
        plu: encontrarColumna(encabezados, esColumnaPlu, null),
        producto: encontrarColumna(encabezados, esColumnaProducto, COLUMNAS_FALLBACK.producto),
        uniKg: uniKg.length ? uniKg : COLUMNAS_FALLBACK.uniKg,
        ventaTotal
    }, filas);

    return {
        ...columnasAjustadas,
        fechasPorColumna: detectarFechasPorColumna(filas, filaEncabezado, columnasAjustadas.uniKg)
    };
}

function ajustarColumnasPorContenido(columnas, filas) {
    const filasDatos = filas
        .filter((fila, indice) => indice !== columnas.filaEncabezado && fila.some(celda => celda !== ""))
        .slice(0, 30);

    if (!filasDatos.length) return columnas;

    const maxColumnas = Math.max(...filasDatos.map(fila => fila.length));
    const puntajes = Array.from({ length: maxColumnas }, (_, indice) =>
        calcularPuntajeColumna(filasDatos, indice)
    );
    const columnasNumericas = new Set([...columnas.uniKg, ...columnas.ventaTotal]);
    const candidatos = puntajes
        .map((puntaje, indice) => ({ ...puntaje, indice }))
        .filter(columna => columna.indice !== columnas.dto && !columnasNumericas.has(columna.indice));

    const columnaPlu =
        columnas.plu !== null
            ? { indice: columnas.plu }
            : candidatos
                  .filter(columna => columna.soloPlu > 0)
                  .sort((a, b) => b.soloPlu - a.soloPlu)[0];
    const columnaProducto = candidatos
        .filter(columna => columna.producto > 0)
        .sort((a, b) => b.producto - a.producto)[0];
    const columnaDepartamento = candidatos
        .filter(columna => {
            if (columna.departamento <= 0) return false;
            if (columnaProducto && columna.indice === columnaProducto.indice) return false;
            if (columnaPlu && columna.indice === columnaPlu.indice) return false;
            return true;
        })
        .sort((a, b) => b.departamento - a.departamento)[0];

    return {
        ...columnas,
        plu: columnaPlu ? columnaPlu.indice : null,
        producto: columnaProducto ? columnaProducto.indice : columnas.producto,
        departamento: columnaDepartamento ? columnaDepartamento.indice : columnas.departamento
    };
}

function calcularPuntajeColumna(filas, indice) {
    return filas.reduce(
        (puntaje, fila) => {
            const valor = String(fila[indice] ?? "").trim();
            if (!valor) return puntaje;
            if (/^\s*\d+\s*$/.test(valor)) puntaje.soloPlu += 1;
            if (pareceProducto(valor)) puntaje.producto += 1;
            if (pareceDepartamento(valor)) puntaje.departamento += 1;
            return puntaje;
        },
        { soloPlu: 0, producto: 0, departamento: 0 }
    );
}

function encontrarFilaEncabezado(filas) {
    let mejorIndice = -1;
    let mejorPuntaje = 0;

    filas.forEach((fila, indice) => {
        const encabezados = fila.map(normalizarTexto);
        const puntaje = encabezados.reduce((total, encabezado) => {
            if (esEncabezadoPrincipal(encabezado)) return total + 1;
            if (esColumnaUniKg(encabezado) || esColumnaVenta(encabezado)) return total + 1;
            return total;
        }, 0);

        if (puntaje > mejorPuntaje) {
            mejorPuntaje = puntaje;
            mejorIndice = indice;
        }
    });

    return mejorPuntaje >= 2 ? mejorIndice : -1;
}

function esEncabezadoPrincipal(encabezado) {
    return (
        esColumnaProducto(encabezado) ||
        esColumnaDepartamento(encabezado) ||
        esColumnaDto(encabezado) ||
        encabezado.includes("PRODUCTO")
    );
}

function encontrarColumna(encabezados, evaluador, fallback) {
    const indice = encabezados.findIndex(evaluador);
    return indice === -1 ? fallback : indice;
}

function esColumnaDto(encabezado) {
    return encabezado === "DTO";
}

function esColumnaDepartamento(encabezado) {
    return (
        encabezado.includes("DEPARTAMENTO") ||
        encabezado === "DEPTO" ||
        encabezado === "DPTO" ||
        encabezado.includes("DEPTO ") ||
        encabezado.includes("DPTO ")
    );
}

function esColumnaPlu(encabezado) {
    return encabezado === "PLU" || encabezado.includes("CODIGO PLU");
}

function esColumnaProducto(encabezado) {
    return encabezado.includes("DESCRIPCION") || encabezado.includes("PRODUCTO");
}

function esDepartamentoValido(valor) {
    const texto = String(valor ?? "").trim();
    const normalizado = normalizarTexto(texto);

    if (!texto || !contieneLetras(texto)) return false;
    if (normalizado === "DEPARTAMENTO" || normalizado === "TOTAL") return false;
    if (/^\d+\s+/.test(texto)) return true;
    if (normalizado.includes("PANADERIA") || normalizado.includes("ROTISERIA")) return true;

    return !pareceProducto(texto);
}

function extraerDto(departamento) {
    const texto = String(departamento ?? "").trim();
    const partes = texto.match(/^(\d+)/);
    return partes ? partes[1] : texto || "Sin DTO";
}

function limpiarDepartamento(departamento) {
    return String(departamento ?? "")
        .trim()
        .replace(/^\d+\s+/, "");
}

function encontrarProductoEnFila(fila) {
    const candidato = fila
        .map((valor, indice) => ({
            indice,
            texto: String(valor ?? "").trim()
        }))
        .filter(celda => celda.texto && contieneLetras(celda.texto))
        .filter(celda => !esTextoEncabezado(celda.texto))
        .sort((a, b) => {
            const productoA = pareceProducto(a.texto) ? 1 : 0;
            const productoB = pareceProducto(b.texto) ? 1 : 0;
            if (productoA !== productoB) return productoB - productoA;
            return b.texto.length - a.texto.length;
        })[0];

    if (!candidato) return "";
    return separarPluProducto(candidato.texto).producto;
}

function esTextoEncabezado(valor) {
    const texto = normalizarTexto(valor);
    return (
        texto === "DTO" ||
        texto === "PLU" ||
        texto === "PRODUCTO" ||
        texto === "DESCRIPCION" ||
        texto.includes("VENTA") ||
        texto.includes("UNI/KG") ||
        texto.includes("UNIKG")
    );
}

function separarPluProducto(valor) {
    const texto = String(valor ?? "").trim();
    const partes = texto.match(/^(\d+)\s*[-./]?\s*(.*)$/);

    if (!partes) {
        return { plu: "", producto: texto };
    }

    return { plu: partes[1], producto: partes[2].trim() };
}

function pareceDepartamento(valor) {
    const texto = String(valor ?? "").trim();
    if (!contieneLetras(texto)) return false;
    if (pareceProducto(texto)) return false;
    return texto.length <= 28;
}

function esProductoValido(producto) {
    const normalizado = normalizarTexto(producto);
    if (!normalizado) return false;

    return ![
        /^AJUSTE\b/,
        /^AJUSTES\b/,
        /^DIFERENCIA\b/,
        /^DIFERENCIAS\b/,
        /^MERMA\b/,
        /^MERMAS\b/,
        /^REPROCESO\b/,
        /^REPROCESOS\b/,
        /^TRANSFERENCIA\b/,
        /^TRANSFERENCIAS\b/
    ].some(patron => patron.test(normalizado));
}

function esFilaResumen(plu, producto, departamento = "") {
    const departamentoNormalizado = normalizarTexto(departamento);
    const productoNormalizado = normalizarTexto(producto);

    return (
        !plu &&
        (
            departamentoNormalizado === "TOTAL" ||
            departamentoNormalizado.startsWith("TOTAL ") ||
            productoNormalizado === "TOTAL" ||
            productoNormalizado.startsWith("TOTAL ")
        )
    );
}

function esColumnaUniKg(encabezado) {
    const sinEspacios = encabezado.replace(/\s+/g, "");
    return (
        sinEspacios === "UNIKG" ||
        sinEspacios === "UNI/KG" ||
        encabezado.includes("UNI KG") ||
        (encabezado.includes("UNIDADES") && encabezado.includes("VENTA"))
    );
}

function esColumnaVenta(encabezado) {
    const compacto = encabezado.replace(/[^A-Z0-9]/g, "");
    return compacto.includes("PVP") && !esColumnaUniKg(encabezado);
}

function detectarParesVentaPorDatos(filas, filaEncabezado, columnaProducto) {
    const inicio = columnaProducto + 1;
    let maxColumna = inicio;
    const filasDatos = filas
        .filter((fila, indice) => indice > filaEncabezado && fila.some(celda => celda !== ""))
        .slice(0, 25);

    filasDatos.forEach(fila => {
        maxColumna = Math.max(maxColumna, fila.length - 1);
    });

    const uniKg = [];
    const ventaTotal = [];

    for (let columna = inicio; columna <= maxColumna; columna += 2) {
        if (filasDatos.some(fila => esParVentaValido(fila[columna], fila[columna + 1]))) {
            uniKg.push(columna);
            ventaTotal.push(columna + 1);
        }
    }

    return { uniKg, ventaTotal };
}

function esParVentaValido(unidades, venta) {
    return parsearNumero(unidades) !== 0 || parsearNumero(venta) !== 0;
}

function reemplazarSiTieneDatos(destino, origen) {
    if (!origen.length) return;
    destino.splice(0, destino.length, ...origen);
}

function sumarColumnas(fila, columnas) {
    return columnas.reduce((total, columna) => total + parsearNumero(fila[columna]), 0);
}

function sumarParesVentaFila(fila, indiceProducto, columnas) {
    const inicio = Math.max(0, indiceProducto + 1);
    let uniKg = 0;
    let ventaTotal = 0;
    let encontroPares = false;
    const ventasPorFecha = {};

    for (let columna = inicio; columna < fila.length - 1; columna += 2) {
        const unidades = parsearNumero(fila[columna]);
        const venta = parsearNumero(fila[columna + 1]);
        const fecha = columnas.fechasPorColumna?.[columna];

        if (fecha) {
            ventasPorFecha[fecha.clave] = {
                fecha: fecha.clave,
                etiqueta: fecha.etiqueta,
                UniKg: unidades,
                VentaTotal: normalizarVentaTotal(venta, unidades)
            };
        }

        if (unidades === 0 && venta === 0) continue;
        uniKg += unidades;
        ventaTotal += venta;
        encontroPares = true;
    }

    if (encontroPares) return { uniKg, ventaTotal, ventasPorFecha };

    return {
        uniKg: sumarColumnas(fila, columnas.uniKg),
        ventaTotal: sumarColumnas(fila, columnas.ventaTotal),
        ventasPorFecha
    };
}

function detectarFechasPorColumna(filas, filaEncabezado, columnasUniKg) {
    if (filaEncabezado <= 0) return {};

    return columnasUniKg.reduce((fechas, columna) => {
        const fecha = buscarFechaEncabezado(filas, filaEncabezado, columna);
        if (fecha) fechas[columna] = fecha;
        return fechas;
    }, {});
}

function buscarFechaEncabezado(filas, filaEncabezado, columna) {
    for (let fila = filaEncabezado - 1; fila >= 0; fila -= 1) {
        const candidatos = [
            filas[fila]?.[columna],
            filas[fila]?.[columna + 1],
            filas[fila]?.[columna - 1]
        ];

        for (const candidato of candidatos) {
            const fecha = parsearFecha(candidato);
            if (fecha) return fecha;
        }
    }

    return null;
}

function parsearFecha(valor) {
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
        return crearFecha(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
    }

    if (typeof valor === "number" && valor >= 20000 && valor <= 80000) {
        const fecha = new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * 86400000);
        return crearFecha(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate());
    }

    const texto = String(valor ?? "").trim();
    const fechaIso = texto.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (fechaIso) {
        return crearFecha(Number(fechaIso[1]), Number(fechaIso[2]), Number(fechaIso[3]));
    }

    const partes = texto.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
    if (!partes) return null;

    const anio = Number(partes[3].length === 2 ? `20${partes[3]}` : partes[3]);
    return crearFecha(anio, Number(partes[2]), Number(partes[1]));
}

function crearFecha(anio, mes, dia) {
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (
        fecha.getUTCFullYear() !== anio ||
        fecha.getUTCMonth() + 1 !== mes ||
        fecha.getUTCDate() !== dia
    ) {
        return null;
    }

    const clave = [
        String(anio).padStart(4, "0"),
        String(mes).padStart(2, "0"),
        String(dia).padStart(2, "0")
    ].join("-");

    return {
        clave,
        etiqueta: `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`
    };
}

function encontrarIndiceProductoFila(fila, producto, fallback) {
    const productoNormalizado = normalizarTexto(producto);
    const indice = fila.findIndex(celda => normalizarTexto(celda) === productoNormalizado);
    return indice === -1 ? fallback : indice;
}

function normalizarVentaTotal(ventaTotal, uniKg) {
    if (uniKg > 0 && ventaTotal < 0) return 0;
    return ventaTotal;
}

function parsearNumero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (valor === null || valor === undefined) return 0;

    let texto = String(valor).trim();
    if (!texto) return 0;
    if (/\p{L}/u.test(texto)) return 0;

    const esNegativo = texto.startsWith("(") && texto.endsWith(")");
    texto = texto
        .replace(/[^\d,.-]/g, "")
        .replace(/^\((.*)\)$/, "$1");

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
    if (!Number.isFinite(numero)) return 0;
    return esNegativo ? -numero : numero;
}
