const PRODUCTOS_POR_PAGINA = 10;
const PRODUCTOS_POR_PAGINA_DTO = 15;
const COLUMNAS_FALLBACK = {
    dto: 0,
    departamento: 1,
    producto: 2,
    uniKg: [3, 5, 7, 9, 11, 13, 15],
    ventaTotal: [4, 6, 8, 10, 12, 14, 16]
};

const formatoNumero = new Intl.NumberFormat("es-AR", {
    useGrouping: false,
    maximumFractionDigits: 2
});

const formatoKg = new Intl.NumberFormat("es-AR", {
    useGrouping: true,
    maximumFractionDigits: 2
});

const formatoMoneda = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
});

let productos = [];

document.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("generarRanking")
        .addEventListener("click", procesarArchivo);

    configurarTema();
    configurarMenuLateral();
});

function configurarTema() {
    const boton = document.getElementById("themeToggle");
    const texto = boton?.querySelector(".theme-toggle-text");
    const preferenciaGuardada = localStorage.getItem("pulsoTema");
    const prefiereOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const temaInicial = preferenciaGuardada || (prefiereOscuro ? "dark" : "light");

    const aplicarTema = tema => {
        const oscuro = tema === "dark";
        document.body.classList.toggle("theme-dark", oscuro);
        document.body.classList.toggle("theme-light", !oscuro);

        if (texto) texto.textContent = oscuro ? "Tema claro" : "Tema oscuro";
        if (boton) {
            boton.setAttribute("aria-label", oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
            boton.setAttribute("aria-pressed", String(oscuro));
        }
    };

    aplicarTema(temaInicial);

    boton?.addEventListener("click", () => {
        const nuevoTema = document.body.classList.contains("theme-dark") ? "light" : "dark";
        localStorage.setItem("pulsoTema", nuevoTema);
        aplicarTema(nuevoTema);
    });
}

function configurarMenuLateral() {
    const boton = document.getElementById("menuToggle");
    const simboloBoton = boton.querySelector(".menu-toggle-symbol");
    const overlay = document.getElementById("menuOverlay");
    const nav = document.querySelector(".sidebar-nav");

    const actualizarBoton = abierto => {
        simboloBoton.textContent = abierto ? "-" : "+";
        boton.setAttribute("aria-label", abierto ? "Cerrar menu" : "Abrir menu");
    };

    const cerrarMenu = () => {
        document.body.classList.remove("menu-open");
        boton.setAttribute("aria-expanded", "false");
        overlay.hidden = true;
        actualizarBoton(false);
    };

    boton.addEventListener("click", () => {
        const abierto = document.body.classList.toggle("menu-open");
        boton.setAttribute("aria-expanded", String(abierto));
        overlay.hidden = !abierto;
        actualizarBoton(abierto);
    });

    actualizarBoton(false);
    overlay.addEventListener("click", cerrarMenu);
    nav.addEventListener("click", event => {
        const enlace = event.target.closest("a");
        if (!enlace) return;

        const destino = document.querySelector(enlace.getAttribute("href"));
        cerrarMenu();

        if (enlace.closest("#menuDto") && destino) {
            event.preventDefault();
            destino.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest"
            });
        }
    });
}

function procesarArchivo() {
    limpiarResultados();

    if (typeof XLSX === "undefined") {
        mostrarMensaje(
            "No se pudo cargar la libreria para leer planillas. Revise la conexion a internet y vuelva a abrir la pagina.",
            "error"
        );
        return;
    }

    const input = document.getElementById("archivo");

    if (!input.files.length) {
        mostrarMensaje("Seleccione un archivo antes de generar el ranking.", "error");
        return;
    }

    const reader = new FileReader();

    reader.onload = event => {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const hoja = workbook.SheetNames[0];

            if (!hoja) {
                mostrarMensaje("El archivo no tiene hojas para procesar.", "error");
                return;
            }

            const worksheet = workbook.Sheets[hoja];
            const filas = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: ""
            });

            productos = obtenerProductos(filas);

            if (!productos.length) {
                mostrarMensaje("No se encontraron productos con unidades o ventas para mostrar.", "info");
                return;
            }

            productos.sort(compararProductosRanking);
            mostrarTabla();
            mostrarRankingPorDto();
        } catch (error) {
            console.error(error);
            mostrarMensaje("No se pudo procesar el archivo. Revise que sea una planilla valida.", "error");
        }
    };

    reader.onerror = () => {
        mostrarMensaje("No se pudo leer el archivo seleccionado.", "error");
    };

    reader.readAsArrayBuffer(input.files[0]);
}

function obtenerProductos(filas) {
    const columnas = detectarColumnas(filas);
    let departamentoActual = "";

    return filas.reduce((resultado, fila, indice) => {
        if (indice <= columnas.filaEncabezado) return resultado;

        const departamentoCelda = String(fila[columnas.departamento] ?? "").trim();
        const plu = String(fila[columnas.plu] ?? "").trim();
        const productoOriginal = String(fila[columnas.producto] ?? "").trim();
        const producto = separarPluProducto(productoOriginal).producto || encontrarProductoEnFila(fila, columnas);

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
                VentaOriginal: ventaCalculada
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

        return {
            filaEncabezado: filaSubencabezado === -1 ? filaDepartamento : filaSubencabezado,
            dto: departamento,
            departamento,
            plu,
            producto,
            uniKg: uniKg.length ? uniKg : COLUMNAS_FALLBACK.uniKg,
            ventaTotal
        };
    }

    const filaEncabezado = encontrarFilaEncabezado(filas);

    if (filaEncabezado === -1) {
        return ajustarColumnasPorContenido({ ...COLUMNAS_FALLBACK, ventaTotal: [], filaEncabezado: -1 }, filas);
    }

    const encabezados = filas[filaEncabezado].map(normalizarTexto);
    const uniKg = [];
    const ventaTotal = [];

    encabezados.forEach((encabezado, indice) => {
        if (indice <= COLUMNAS_FALLBACK.producto) return;
        if (esColumnaUniKg(encabezado)) uniKg.push(indice);
        if (esColumnaVenta(encabezado)) ventaTotal.push(indice);
    });

    return ajustarColumnasPorContenido({
        filaEncabezado,
        dto: encontrarColumna(encabezados, esColumnaDto, COLUMNAS_FALLBACK.dto),
        departamento: encontrarColumna(
            encabezados,
            esColumnaDepartamento,
            COLUMNAS_FALLBACK.departamento
        ),
        plu: encontrarColumna(encabezados, esColumnaPlu, null),
        producto: encontrarColumna(encabezados, esColumnaProducto, COLUMNAS_FALLBACK.producto),
        uniKg: uniKg.length ? uniKg : COLUMNAS_FALLBACK.uniKg,
        ventaTotal
    }, filas);
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

            if (esSoloPlu(valor)) puntaje.soloPlu += 1;
            if (pareceProducto(valor)) puntaje.producto += 1;
            if (pareceDepartamento(valor)) puntaje.departamento += 1;

            return puntaje;
        },
        {
            soloPlu: 0,
            producto: 0,
            departamento: 0
        }
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

function encontrarProductoEnFila(fila, columnas) {
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
        return {
            plu: "",
            producto: texto
        };
    }

    return {
        plu: partes[1],
        producto: partes[2].trim()
    };
}

function empiezaConPlu(valor) {
    return /^\s*\d+/.test(String(valor ?? ""));
}

function esSoloPlu(valor) {
    return /^\s*\d+\s*$/.test(String(valor ?? ""));
}

function contieneLetras(valor) {
    return /\p{L}/u.test(String(valor ?? ""));
}

function pareceProducto(valor) {
    const texto = String(valor ?? "").trim();
    const normalizado = normalizarTexto(texto);

    if (!contieneLetras(texto)) return false;
    if (empiezaConPlu(texto)) return true;

    return (
        normalizado.includes(" KGM") ||
        normalizado.includes(" UNI") ||
        normalizado.includes(" GRM") ||
        normalizado.includes(" COTO") ||
        normalizado.includes(" XKG") ||
        normalizado.length > 18
    );
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

function pareceDepartamento(valor) {
    const texto = String(valor ?? "").trim();

    if (!contieneLetras(texto)) return false;
    if (pareceProducto(texto)) return false;

    return texto.length <= 28;
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

function tieneLetras(valor) {
    return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(String(valor ?? ""));
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

    for (let columna = inicio; columna < fila.length - 1; columna += 2) {
        const unidades = parsearNumero(fila[columna]);
        const venta = parsearNumero(fila[columna + 1]);

        if (unidades === 0 && venta === 0) continue;

        uniKg += unidades;
        ventaTotal += venta;
        encontroPares = true;
    }

    if (encontroPares) return { uniKg, ventaTotal };

    return {
        uniKg: sumarColumnas(fila, columnas.uniKg),
        ventaTotal: sumarColumnas(fila, columnas.ventaTotal)
    };
}

function encontrarIndiceProductoFila(fila, producto, fallback) {
    const productoNormalizado = normalizarTexto(producto);
    const indice = fila.findIndex(celda => normalizarTexto(celda) === productoNormalizado);
    return indice === -1 ? fallback : indice;
}

function normalizarVentaTotal(ventaTotal, uniKg) {
    // En algunos Excel aparecen centavos negativos residuales aunque hubo unidades vendidas.
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

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function mostrarTabla() {
    const resultado = document.getElementById("resultado");

    limpiarNodo(resultado);
    limpiarNodo(document.getElementById("paginacion"));

    const seccionRanking = document.createElement("section");
    seccionRanking.className = "ranking-table";

    const titulo = document.createElement("h2");
    titulo.textContent = "Ranking de Productos";
    seccionRanking.appendChild(titulo);
    seccionRanking.appendChild(crearTablaResumen(productos));
    seccionRanking.appendChild(crearControlesTabla("Filtrar ranking"));

    const tabla = document.createElement("table");
    tabla.className = "data-table";
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    thead.appendChild(crearEncabezadoProductos());
    tabla.appendChild(thead);

    productos.forEach(item => {
        const fila = document.createElement("tr");

        fila.dataset.producto = item.Producto;
        fila.dataset.venta = String(item.VentaTotal);
        fila.dataset.unidades = String(item.UniKg);
        fila.dataset.tipo = obtenerTipoUnidad(item.Producto);

        [
            item.PLU,
            item.Producto,
            formatearUniKg(item.Producto, item.UniKg),
            formatoMoneda.format(item.VentaTotal)
        ].forEach(texto => {
            const td = document.createElement("td");
            td.textContent = texto;
            fila.appendChild(td);
        });

        tbody.appendChild(fila);
    });

    tabla.appendChild(tbody);
    seccionRanking.appendChild(tabla);
    resultado.appendChild(seccionRanking);
    configurarControlesTabla(seccionRanking);
}

function mostrarRankingPorDto() {
    const contenedor = document.getElementById("rankingDto");
    const grupos = agruparProductosPorDto(productos).filter(grupo => !esGrupoTotal(grupo));

    limpiarNodo(contenedor);

    if (!grupos.length) return;

    const titulo = document.createElement("h2");
    titulo.textContent = "Ranking por DTO";
    contenedor.appendChild(titulo);
    actualizarMenuDto(grupos);

    const grid = document.createElement("div");
    grid.className = "dto-grid";

    grupos.forEach(grupo => {
        const bloque = document.createElement("section");
        bloque.className = "dto-table";
        bloque.id = crearIdDto(grupo);

        const encabezado = document.createElement("h3");
        encabezado.textContent = grupo.departamento;
        bloque.appendChild(encabezado);
        bloque.appendChild(crearTablaResumen(grupo.productos));
        bloque.appendChild(crearControlesTabla(`Filtrar ${grupo.departamento}`));
        bloque.appendChild(crearTablaProductos(grupo.productos));
        configurarControlesTabla(bloque, PRODUCTOS_POR_PAGINA_DTO);
        grid.appendChild(bloque);
    });

    contenedor.appendChild(grid);
}

function actualizarMenuDto(grupos) {
    const menu = document.getElementById("menuDto");
    if (!menu) return;

    limpiarNodo(menu);

    grupos.forEach(grupo => {
        const enlace = document.createElement("a");
        enlace.href = `#${crearIdDto(grupo)}`;
        enlace.textContent = grupo.departamento;
        menu.appendChild(enlace);
    });
}

function esGrupoTotal(grupo) {
    return normalizarTexto(grupo.dto) === "TOTAL" || normalizarTexto(grupo.departamento) === "TOTAL";
}

function crearIdDto(grupo) {
    return `dto-${normalizarId(grupo.dto || grupo.departamento)}`;
}

function normalizarId(valor) {
    return normalizarTexto(valor)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "sin-dto";
}

function crearTablaResumen(lista) {
    const tabla = document.createElement("table");
    tabla.className = "summary-table";
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const encabezado = document.createElement("tr");

    ["Tipo", "Total", "Venta"].forEach(texto => {
        const th = document.createElement("th");
        th.textContent = texto;
        encabezado.appendChild(th);
    });

    thead.appendChild(encabezado);
    tabla.appendChild(thead);

    const totales = calcularTotalesUniKg(lista);

    [
        ["Unidades vendidas", totales.uni],
        ["Productos por kg vendidos", totales.kg]
    ].forEach(([texto, total]) => {
        const fila = document.createElement("tr");

        [
            texto,
            formatearUniKg(texto, total.uniKg),
            formatoMoneda.format(total.ventaTotal)
        ].forEach(valor => {
            const td = document.createElement("td");
            td.textContent = valor;
            fila.appendChild(td);
        });

        tbody.appendChild(fila);
    });

    tabla.appendChild(tbody);
    return tabla;
}

function calcularTotalesUniKg(lista) {
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

function obtenerTipoUnidad(producto) {
    const texto = normalizarTexto(producto);
    if (/\bUNI\b/.test(texto)) return "uni";
    return "kg";
}

function formatearUniKg(producto, valor) {
    return obtenerTipoUnidad(producto) === "kg"
        ? formatoKg.format(valor)
        : formatoNumero.format(valor);
}

function compararProductosRanking(a, b) {
    const diferenciaVenta = b.VentaTotal - a.VentaTotal;
    if (diferenciaVenta !== 0) return diferenciaVenta;

    const diferenciaUnidades = b.UniKg - a.UniKg;
    if (diferenciaUnidades !== 0) return diferenciaUnidades;

    return a.Producto.localeCompare(b.Producto, "es", { sensitivity: "base" });
}

function agruparProductosPorDto(lista) {
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

function crearTablaProductos(lista) {
    const tabla = document.createElement("table");
    tabla.className = "data-table";
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    thead.appendChild(crearEncabezadoProductos());
    tabla.appendChild(thead);

    lista.forEach((item, index) => {
        const fila = document.createElement("tr");

        fila.dataset.producto = item.Producto;
        fila.dataset.venta = String(item.VentaTotal);
        fila.dataset.unidades = String(item.UniKg);
        fila.dataset.tipo = obtenerTipoUnidad(item.Producto);

        [
            item.PLU,
            item.Producto,
            formatearUniKg(item.Producto, item.UniKg),
            formatoMoneda.format(item.VentaTotal)
        ].forEach(texto => {
            const td = document.createElement("td");
            td.textContent = texto;
            fila.appendChild(td);
        });

        tbody.appendChild(fila);
    });

    tabla.appendChild(tbody);
    return tabla;
}

function crearEncabezadoProductos() {
    const encabezado = document.createElement("tr");

    [
        { texto: "PLU" },
        { texto: "Producto" },
        {
            texto: "UNI/KG",
            ordenes: [
                ["unidades-desc", "↓", "Ordenar UNI/KG de mayor a menor"],
                ["unidades-asc", "↑", "Ordenar UNI/KG de menor a mayor"]
            ]
        },
        {
            texto: "Venta Total",
            ordenes: [
                ["venta-desc", "↓", "Ordenar venta de mayor a menor"],
                ["venta-asc", "↑", "Ordenar venta de menor a mayor"]
            ]
        }
    ].forEach(columna => {
        const th = document.createElement("th");

        if (!columna.ordenes) {
            th.textContent = columna.texto;
            encabezado.appendChild(th);
            return;
        }

        const contenido = document.createElement("span");
        contenido.className = "sortable-heading";

        const etiqueta = document.createElement("span");
        etiqueta.textContent = columna.texto;
        contenido.appendChild(etiqueta);

        const acciones = document.createElement("span");
        acciones.className = "sort-actions";

        columna.ordenes.forEach(([orden, texto, aria]) => {
            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "sort-button";
            boton.dataset.sort = orden;
            boton.textContent = texto;
            boton.setAttribute("aria-label", aria);
            acciones.appendChild(boton);
        });

        contenido.appendChild(acciones);
        th.appendChild(contenido);
        encabezado.appendChild(th);
    });

    return encabezado;
}

function crearControlesTabla(placeholder) {
    const controles = document.createElement("div");
    controles.className = "table-controls";

    const filtro = document.createElement("input");
    filtro.type = "search";
    filtro.className = "table-filter";
    filtro.placeholder = placeholder;
    filtro.setAttribute("aria-label", placeholder);

    const tipo = document.createElement("select");
    tipo.className = "table-unit-filter";
    tipo.setAttribute("aria-label", "Filtrar por tipo");

    [
        ["todos", "Todos"],
        ["uni", "Solo UNI"],
        ["kg", "Solo KG"]
    ].forEach(([valor, texto]) => {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        tipo.appendChild(opcion);
    });

    controles.appendChild(filtro);
    controles.appendChild(tipo);
    return controles;
}

function configurarControlesTabla(contenedor, productosPorPagina = PRODUCTOS_POR_PAGINA) {
    const filtro = contenedor.querySelector(".table-filter");
    const tipo = contenedor.querySelector(".table-unit-filter");
    const tabla = contenedor.querySelector(".data-table");
    const tbody = tabla?.querySelector("tbody");

    if (!filtro || !tipo || !tabla || !tbody) return;

    let ordenActual = "venta-desc";
    let paginaActualTabla = 1;
    let paginacion = contenedor.querySelector(".table-pagination");

    if (!paginacion) {
        paginacion = document.createElement("div");
        paginacion.className = "table-pagination";
        paginacion.setAttribute("aria-label", "Paginacion de tabla");
        tabla.insertAdjacentElement("afterend", paginacion);
    }

    const aplicar = (reiniciarPagina = false) => {
        const filas = Array.from(tbody.querySelectorAll("tr"));
        const busqueda = normalizarTexto(filtro.value);
        const tipoSeleccionado = tipo.value;

        if (reiniciarPagina) paginaActualTabla = 1;

        filas.sort((a, b) => compararFilas(a, b, ordenActual));
        filas.forEach(fila => tbody.appendChild(fila));

        const filasFiltradas = filas.filter(fila => {
            const textoFila = normalizarTexto(fila.textContent);
            const coincideBusqueda = !busqueda || textoFila.includes(busqueda);
            const coincideTipo = tipoSeleccionado === "todos" || fila.dataset.tipo === tipoSeleccionado;
            return coincideBusqueda && coincideTipo;
        });

        const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / productosPorPagina));
        paginaActualTabla = Math.min(paginaActualTabla, totalPaginas);

        const inicio = (paginaActualTabla - 1) * productosPorPagina;
        const fin = inicio + productosPorPagina;
        const filasPagina = new Set(filasFiltradas.slice(inicio, fin));

        filas.forEach(fila => {
            fila.hidden = !filasPagina.has(fila);
        });

        crearPaginacionTabla(paginacion, totalPaginas, paginaActualTabla, pagina => {
            paginaActualTabla = pagina;
            aplicar();
        });
    };

    tabla.addEventListener("click", event => {
        const botonOrden = event.target.closest(".sort-button");
        if (!botonOrden) return;

        ordenActual = botonOrden.dataset.sort;
        actualizarBotonesOrden(tabla, ordenActual);
        aplicar(true);
    });

    filtro.addEventListener("input", () => aplicar(true));
    tipo.addEventListener("change", () => aplicar(true));
    actualizarBotonesOrden(tabla, ordenActual);
    aplicar();
}

function actualizarBotonesOrden(tabla, ordenActual) {
    tabla.querySelectorAll(".sort-button").forEach(boton => {
        const activo = boton.dataset.sort === ordenActual;
        boton.classList.toggle("active", activo);
        boton.setAttribute("aria-pressed", String(activo));
    });
}

function compararFilas(a, b, orden) {
    const ventaA = Number(a.dataset.venta);
    const ventaB = Number(b.dataset.venta);
    const unidadesA = Number(a.dataset.unidades);
    const unidadesB = Number(b.dataset.unidades);

    if (orden === "venta-asc") {
        const diferenciaVenta = ventaA - ventaB;
        if (diferenciaVenta !== 0) return diferenciaVenta;
        return unidadesA - unidadesB;
    }

    if (orden === "unidades-asc") {
        const diferenciaUnidades = unidadesA - unidadesB;
        if (diferenciaUnidades !== 0) return diferenciaUnidades;
        return ventaA - ventaB;
    }

    if (orden === "unidades-desc") {
        const diferenciaUnidades = unidadesB - unidadesA;
        if (diferenciaUnidades !== 0) return diferenciaUnidades;
        return ventaB - ventaA;
    }

    const diferenciaVenta = ventaB - ventaA;
    if (diferenciaVenta !== 0) return diferenciaVenta;

    return unidadesB - unidadesA;
}

function crearPaginacionTabla(paginacion, totalPaginas, paginaActualTabla, cambiarPaginaTabla) {
    limpiarNodo(paginacion);

    if (totalPaginas <= 1) return;

    paginacion.appendChild(
        crearBotonPagina("Anterior", paginaActualTabla - 1, paginaActualTabla === 1, cambiarPaginaTabla)
    );

    for (let i = 1; i <= totalPaginas; i++) {
        if (!debeMostrarPagina(i, paginaActualTabla, totalPaginas)) continue;
        agregarSeparadorSiHaceFalta(paginacion, i);

        const boton = crearBotonPagina(i, i, false, cambiarPaginaTabla);
        if (paginaActualTabla === i) boton.classList.add("active");
        paginacion.appendChild(boton);
    }

    paginacion.appendChild(
        crearBotonPagina(
            "Siguiente",
            paginaActualTabla + 1,
            paginaActualTabla === totalPaginas,
            cambiarPaginaTabla
        )
    );
}

function debeMostrarPagina(pagina, paginaActualTabla, totalPaginas) {
    return (
        pagina === 1 ||
        pagina === totalPaginas ||
        Math.abs(pagina - paginaActualTabla) <= 1
    );
}

function agregarSeparadorSiHaceFalta(paginacion, pagina) {
    const ultimoBoton = Array.from(paginacion.querySelectorAll("button")).at(-1);
    const ultimaPagina = Number(ultimoBoton?.dataset.pagina);

    if (!ultimaPagina || pagina - ultimaPagina <= 1) return;

    const separador = document.createElement("span");
    separador.className = "pagination-ellipsis";
    separador.textContent = "...";
    paginacion.appendChild(separador);
}

function crearBotonPagina(texto, numero, deshabilitado, cambiarPaginaTabla) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = texto;
    boton.disabled = deshabilitado;
    boton.dataset.pagina = String(numero);
    boton.addEventListener("click", () => cambiarPaginaTabla(numero));
    return boton;
}

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById("mensaje");
    mensaje.textContent = texto;
    mensaje.className = tipo;
}

function limpiarResultados() {
    productos = [];
    limpiarNodo(document.getElementById("resultado"));
    limpiarNodo(document.getElementById("paginacion"));
    limpiarNodo(document.getElementById("rankingDto"));
    limpiarNodo(document.getElementById("menuDto"));
    mostrarMensaje("", "");
}

function limpiarNodo(nodo) {
    while (nodo.firstChild) {
        nodo.removeChild(nodo.firstChild);
    }
}

