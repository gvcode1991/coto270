let productos = [];
let paginaActual = 1;
const productosPorPagina = 20;

function procesarArchivo() {
    const input = document.getElementById("archivo");

    if (!input.files.length) {
        alert("Seleccione un archivo.");
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);

        const workbook = XLSX.read(data, { type: "array" });
        const hoja = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[hoja];

        const filas = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ""
        });

        productos = [];

        filas.forEach(fila => {
            const producto = fila[2];

            if (!producto || producto === "Producto") return;

            let uniKg = 0;
            let ventaTotal = 0;

            [3, 5, 7, 9, 11, 13, 15].forEach(i => {
                uniKg += Number(fila[i]) || 0;
            });

            [4, 6, 8, 10, 12, 14, 16].forEach(i => {
                ventaTotal += Number(fila[i]) || 0;
            });

            if (ventaTotal > 0 || uniKg > 0) {
                productos.push({
                    Producto: producto,
                    UniKg: uniKg,
                    VentaTotal: ventaTotal
                });
            }
        });

        productos.sort((a, b) => b.VentaTotal - a.VentaTotal);

        paginaActual = 1;
        mostrarTabla();
    };

    reader.readAsArrayBuffer(file);
}

function mostrarTabla() {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const pagina = productos.slice(inicio, fin);

    let html = `
        <h2>Ranking de Productos</h2>

        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>UNI/KG</th>
                    <th>Venta Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    pagina.forEach((item, index) => {
        html += `
            <tr>
                <td>${inicio + index + 1}</td>
                <td>${item.Producto}</td>
                <td>${item.UniKg.toLocaleString("es-AR")}</td>
                <td>$${item.VentaTotal.toLocaleString("es-AR")}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    document.getElementById("resultado").innerHTML = html;
    crearPaginacion();
}

function crearPaginacion() {
    const totalPaginas = Math.ceil(productos.length / productosPorPagina);

    let botones = `
        <button onclick="cambiarPagina(${paginaActual - 1})"
        ${paginaActual === 1 ? "disabled" : ""}>
            Anterior
        </button>
    `;

    for (let i = 1; i <= totalPaginas; i++) {
        botones += `
            <button onclick="cambiarPagina(${i})"
            class="${paginaActual === i ? "active" : ""}">
                ${i}
            </button>
        `;
    }

    botones += `
        <button onclick="cambiarPagina(${paginaActual + 1})"
        ${paginaActual === totalPaginas ? "disabled" : ""}>
            Siguiente
        </button>
    `;

    document.getElementById("paginacion").innerHTML = botones;
}

function cambiarPagina(numero) {
    const totalPaginas = Math.ceil(productos.length / productosPorPagina);

    if (numero < 1 || numero > totalPaginas) return;

    paginaActual = numero;
    mostrarTabla();
}