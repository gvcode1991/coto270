const PRODUCTOS_POR_PAGINA = 20;
const COLUMNAS_FALLBACK = {
    dto: 0,
    departamento: 1,
    producto: 2,
    uniKg: [3, 5, 7, 9, 11, 13, 15],
    ventaTotal: [4, 6, 8, 10, 12, 14, 16]
};

const formatoNumero = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2
});

const formatoMoneda = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
});

let productos = [];
let paginaActual = 1;

document.addEventListener("DOMContentLoaded", () => {
    document
        .getElementById("generarRanking")
        .addEventListener("click", procesarArchivo);

    configurarMenuLateral();
});

function configurarMenuLateral() {
    const boton = document.getElementById("menuToggle");
    const overlay = document.getElementById("menuOverlay");
    const enlaces = document.querySelectorAll(".sidebar-nav a");

    const cerrarMenu = () => {
        document.body.classList.remove("menu-open");
        boton.setAttribute("aria-expanded", "false");
        overlay.hidden = true;
    };

    boton.addEventListener("click", () => {
        const abierto = document.body.classList.toggle("menu-open");
        boton.setAttribute("aria-expanded", String(abierto));
        overlay.hidden = !abierto;
    });

    overlay.addEventListener("click", cerrarMenu);
    enlaces.forEach(enlace => enlace.addEventListener("click", cerrarMenu));
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

            productos.sort((a, b) => b.VentaTotal - a.VentaTotal);
            paginaActual = 1;
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
        if (esDepartamentoValido(departamentoCelda)) {
            departamentoActual = departamentoCelda;
        }

        const dto = extraerDto(departamentoActual);
        const plu = String(fila[columnas.plu] ?? "").trim();
        const productoOriginal = String(fila[columnas.producto] ?? "").trim();
        const producto = separarPluProducto(productoOriginal).producto || encontrarProductoEnFila(fila, columnas);
        const departamento = limpiarDepartamento(departamentoActual);
        const productoNormalizado = normalizarTexto(producto);

        if (!plu && !producto) return resultado;
        if (productoNormalizado === "DESCRIPCION" || productoNormalizado === "PRODUCTO") return resultado;

        const uniKg = sumarColumnas(fila, columnas.uniKg);
        const ventaTotal = sumarColumnas(fila, columnas.ventaTotal);

        if (ventaTotal > 0 || uniKg > 0) {
            resultado.push({
                PLU: plu,
                Producto: producto,
                DTO: dto,
                Departamento: departamento,
                UniKg: uniKg,
                VentaTotal: ventaTotal
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
        const plu = encontrarColumna(encabezados, encabezado => encabezado.includes("PRODUCTO"), 1);
        const producto = plu + 1;
        const uniKg = [];
        const ventaTotal = [];

        subencabezados.forEach((encabezado, indice) => {
            if (esColumnaUniKg(encabezado)) uniKg.push(indice);
            if (esColumnaVenta(encabezado)) ventaTotal.push(indice);
        });

        return {
            filaEncabezado: filaSubencabezado === -1 ? filaDepartamento : filaSubencabezado,
            dto: departamento,
            departamento,
            plu,
            producto,
            uniKg: uniKg.length ? uniKg : COLUMNAS_FALLBACK.uniKg,
            ventaTotal: ventaTotal.length ? ventaTotal : COLUMNAS_FALLBACK.ventaTotal
        };
    }

    const filaEncabezado = encontrarFilaEncabezado(filas);

    if (filaEncabezado === -1) {
        return ajustarColumnasPorContenido({ ...COLUMNAS_FALLBACK, filaEncabezado: -1 }, filas);
    }

    const encabezados = filas[filaEncabezado].map(normalizarTexto);
    const uniKg = [];
    const ventaTotal = [];

    encabezados.forEach((encabezado, indice) => {
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
        ventaTotal: ventaTotal.length ? ventaTotal : COLUMNAS_FALLBACK.ventaTotal
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
    if (normalizado === "DEPARTAMENTO") return false;
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

function resolverDatosProducto(departamento, producto) {
    const departamentoSeparado = separarPluProducto(departamento);
    const productoSeparado = separarPluProducto(producto);
    const departamentoEsSoloTexto = contieneLetras(departamento) && !empiezaConPlu(departamento);
    const productoEsSoloPlu = esSoloPlu(producto);

    if (!producto && departamentoEsSoloTexto) {
        return {
            departamento: "",
            plu: "",
            producto: departamento
        };
    }

    if (productoEsSoloPlu && departamentoEsSoloTexto) {
        return {
            departamento: "",
            plu: producto,
            producto: departamento
        };
    }

    if (departamentoSeparado.plu && producto && !productoSeparado.plu) {
        return {
            departamento: producto,
            plu: departamentoSeparado.plu,
            producto: departamentoSeparado.producto
        };
    }

    if (productoSeparado.plu) {
        return {
            departamento,
            plu: productoSeparado.plu,
            producto: productoSeparado.producto
        };
    }

    if (departamentoSeparado.plu) {
        return {
            departamento: "",
            plu: departamentoSeparado.plu,
            producto: departamentoSeparado.producto
        };
    }

    return {
        departamento,
        plu: "",
        producto
    };
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

function pareceDepartamento(valor) {
    const texto = String(valor ?? "").trim();

    if (!contieneLetras(texto)) return false;
    if (pareceProducto(texto)) return false;

    return texto.length <= 28;
}

function tieneLetras(valor) {
    return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(String(valor ?? ""));
}

function esColumnaUniKg(encabezado) {
    const sinEspacios = encabezado.replace(/\s+/g, "");
    return sinEspacios === "UNIKG" || sinEspacios === "UNI/KG" || encabezado.includes("UNI KG");
}

function esColumnaVenta(encabezado) {
    return encabezado.includes("VENTA") && (encabezado.includes("TOTAL") || encabezado.includes("$"));
}

function sumarColumnas(fila, columnas) {
    return columnas.reduce((total, columna) => total + parsearNumero(fila[columna]), 0);
}

function parsearNumero(valor) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    if (valor === null || valor === undefined) return 0;

    let texto = String(valor).trim();
    if (!texto) return 0;

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
    const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
    const fin = inicio + PRODUCTOS_POR_PAGINA;
    const pagina = productos.slice(inicio, fin);
    const resultado = document.getElementById("resultado");

    limpiarNodo(resultado);

    const titulo = document.createElement("h2");
    titulo.textContent = "Ranking de Productos";
    resultado.appendChild(titulo);
    resultado.appendChild(crearControlesTabla("Filtrar ranking"));

    const tabla = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const encabezado = document.createElement("tr");
    ["Producto", "PLU", "UNI/KG", "Venta Total"].forEach(texto => {
        const th = document.createElement("th");
        th.textContent = texto;
        encabezado.appendChild(th);
    });

    thead.appendChild(encabezado);
    tabla.appendChild(thead);

    pagina.forEach((item, index) => {
        const fila = document.createElement("tr");

        fila.dataset.producto = item.Producto;
        fila.dataset.venta = String(item.VentaTotal);

        [
            item.Producto,
            item.PLU,
            formatoNumero.format(item.UniKg),
            formatoMoneda.format(item.VentaTotal)
        ].forEach(texto => {
            const td = document.createElement("td");
            td.textContent = texto;
            fila.appendChild(td);
        });

        tbody.appendChild(fila);
    });

    tabla.appendChild(tbody);
    resultado.appendChild(tabla);
    configurarControlesTabla(resultado);
    crearPaginacion();
}

function mostrarRankingPorDto() {
    const contenedor = document.getElementById("rankingDto");
    const grupos = agruparProductosPorDto(productos);

    limpiarNodo(contenedor);

    if (!grupos.length) return;

    const titulo = document.createElement("h2");
    titulo.textContent = "Ranking por DTO";
    contenedor.appendChild(titulo);

    const grid = document.createElement("div");
    grid.className = "dto-grid";

    grupos.forEach(grupo => {
        const bloque = document.createElement("section");
        bloque.className = "dto-table";

        const encabezado = document.createElement("h3");
        encabezado.textContent = grupo.departamento;
        bloque.appendChild(encabezado);
        bloque.appendChild(crearControlesTabla(`Filtrar ${grupo.departamento}`));
        bloque.appendChild(crearTablaProductos(grupo.productos));
        configurarControlesTabla(bloque);
        grid.appendChild(bloque);
    });

    contenedor.appendChild(grid);
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
            productos: grupo.productos.sort((a, b) => b.VentaTotal - a.VentaTotal)
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
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const encabezado = document.createElement("tr");

    ["Producto", "PLU", "UNI/KG", "Venta Total"].forEach(texto => {
        const th = document.createElement("th");
        th.textContent = texto;
        encabezado.appendChild(th);
    });

    thead.appendChild(encabezado);
    tabla.appendChild(thead);

    lista.forEach((item, index) => {
        const fila = document.createElement("tr");

        fila.dataset.producto = item.Producto;
        fila.dataset.venta = String(item.VentaTotal);

        [
            item.Producto,
            item.PLU,
            formatoNumero.format(item.UniKg),
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

function crearControlesTabla(placeholder) {
    const controles = document.createElement("div");
    controles.className = "table-controls";

    const filtro = document.createElement("input");
    filtro.type = "search";
    filtro.className = "table-filter";
    filtro.placeholder = placeholder;
    filtro.setAttribute("aria-label", placeholder);

    const orden = document.createElement("select");
    orden.className = "table-sort";
    orden.setAttribute("aria-label", "Ordenar tabla");

    [
        ["venta-desc", "Mayor venta"],
        ["venta-asc", "Menor venta"],
        ["producto-asc", "Producto A-Z"]
    ].forEach(([valor, texto]) => {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        orden.appendChild(opcion);
    });

    controles.appendChild(filtro);
    controles.appendChild(orden);
    return controles;
}

function configurarControlesTabla(contenedor) {
    const filtro = contenedor.querySelector(".table-filter");
    const orden = contenedor.querySelector(".table-sort");
    const tbody = contenedor.querySelector("tbody");

    if (!filtro || !orden || !tbody) return;

    const aplicar = () => {
        const filas = Array.from(tbody.querySelectorAll("tr"));
        const busqueda = normalizarTexto(filtro.value);

        filas.sort((a, b) => compararFilas(a, b, orden.value));
        filas.forEach(fila => tbody.appendChild(fila));

        filas.forEach(fila => {
            const textoFila = normalizarTexto(fila.textContent);
            fila.hidden = busqueda && !textoFila.includes(busqueda);
        });
    };

    filtro.addEventListener("input", aplicar);
    orden.addEventListener("change", aplicar);
    aplicar();
}

function compararFilas(a, b, orden) {
    if (orden === "venta-asc") return Number(a.dataset.venta) - Number(b.dataset.venta);
    if (orden === "producto-asc") {
        return a.dataset.producto.localeCompare(b.dataset.producto, "es", { sensitivity: "base" });
    }

    return Number(b.dataset.venta) - Number(a.dataset.venta);
}

function crearPaginacion() {
    const paginacion = document.getElementById("paginacion");
    const totalPaginas = Math.ceil(productos.length / PRODUCTOS_POR_PAGINA);

    limpiarNodo(paginacion);

    if (totalPaginas <= 1) return;

    paginacion.appendChild(crearBotonPagina("Anterior", paginaActual - 1, paginaActual === 1));

    for (let i = 1; i <= totalPaginas; i++) {
        const boton = crearBotonPagina(i, i, false);
        if (paginaActual === i) boton.classList.add("active");
        paginacion.appendChild(boton);
    }

    paginacion.appendChild(
        crearBotonPagina("Siguiente", paginaActual + 1, paginaActual === totalPaginas)
    );
}

function crearBotonPagina(texto, numero, deshabilitado) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = texto;
    boton.disabled = deshabilitado;
    boton.addEventListener("click", () => cambiarPagina(numero));
    return boton;
}

function cambiarPagina(numero) {
    const totalPaginas = Math.ceil(productos.length / PRODUCTOS_POR_PAGINA);

    if (numero < 1 || numero > totalPaginas) return;

    paginaActual = numero;
    mostrarTabla();
}

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById("mensaje");
    mensaje.textContent = texto;
    mensaje.className = tipo;
}

function limpiarResultados() {
    productos = [];
    paginaActual = 1;
    limpiarNodo(document.getElementById("resultado"));
    limpiarNodo(document.getElementById("paginacion"));
    limpiarNodo(document.getElementById("rankingDto"));
    mostrarMensaje("", "");
}

function limpiarNodo(nodo) {
    while (nodo.firstChild) {
        nodo.removeChild(nodo.firstChild);
    }
}
