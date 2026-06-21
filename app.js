const PRODUCTOS_POR_PAGINA = 20;
const COLUMNAS_FALLBACK = {
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

    return filas.reduce((resultado, fila, indice) => {
        if (indice === columnas.filaEncabezado) return resultado;

        const producto = String(fila[columnas.producto] ?? "").trim();
        const productoNormalizado = normalizarTexto(producto);

        if (!producto || productoNormalizado === "PRODUCTO") return resultado;

        const uniKg = sumarColumnas(fila, columnas.uniKg);
        const ventaTotal = sumarColumnas(fila, columnas.ventaTotal);

        if (ventaTotal > 0 || uniKg > 0) {
            resultado.push({
                Producto: producto,
                UniKg: uniKg,
                VentaTotal: ventaTotal
            });
        }

        return resultado;
    }, []);
}

function detectarColumnas(filas) {
    const filaEncabezado = filas.findIndex(fila =>
        fila.some(celda => normalizarTexto(celda).includes("PRODUCTO"))
    );

    if (filaEncabezado === -1) return { ...COLUMNAS_FALLBACK, filaEncabezado: -1 };

    const encabezados = filas[filaEncabezado].map(normalizarTexto);
    const producto = encabezados.findIndex(encabezado => encabezado.includes("PRODUCTO"));
    const uniKg = [];
    const ventaTotal = [];

    encabezados.forEach((encabezado, indice) => {
        if (esColumnaUniKg(encabezado)) uniKg.push(indice);
        if (esColumnaVenta(encabezado)) ventaTotal.push(indice);
    });

    return {
        filaEncabezado,
        producto: producto === -1 ? COLUMNAS_FALLBACK.producto : producto,
        uniKg: uniKg.length ? uniKg : COLUMNAS_FALLBACK.uniKg,
        ventaTotal: ventaTotal.length ? ventaTotal : COLUMNAS_FALLBACK.ventaTotal
    };
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

    const tabla = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const encabezado = document.createElement("tr");
    ["#", "Producto", "UNI/KG", "Venta Total"].forEach(texto => {
        const th = document.createElement("th");
        th.textContent = texto;
        encabezado.appendChild(th);
    });

    thead.appendChild(encabezado);
    tabla.appendChild(thead);

    pagina.forEach((item, index) => {
        const fila = document.createElement("tr");

        [
            inicio + index + 1,
            item.Producto,
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
    crearPaginacion();
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
    mostrarMensaje("", "");
}

function limpiarNodo(nodo) {
    while (nodo.firstChild) {
        nodo.removeChild(nodo.firstChild);
    }
}
