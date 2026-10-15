import { test, expect } from "@playwright/test";
import * as XLSX from "xlsx";

async function preparar(page, rol = "admin") {
    const productos = Array.from({ length: 25 }, (_, i) => ({
        _id: (i + 1).toString(16).padStart(24, "0"), PLU: String(100 + i),
        Producto: `Producto ${String(i).padStart(2, "0")}`, DTO: "25", Departamento: "Panaderia",
        UnidadMedida: "uni", Categoria: "producto-final", Activo: true
    }));
    const historico = { ...productos[0], Producto: "Harina historica", UnidadMedida: "kg", Categoria: "materia-prima", CantidadContada: 12.5 };
    const balances = Array.from({ length: 45 }, (_, i) => ({ _id: String(i), fecha: "2026-06-25", tipo: "cierre", estado: "contado", productos: [{ ...historico }] }));
    const reportes = Array.from({ length: 105 }, (_, i) => ({ _id: String(i), nombreArchivo: `Reporte ${i}`, periodo: { inicio: "2026-06-15", fin: "2026-06-21" }, resumen: { productos: 1, ventaTotal: 1234 }, updatedAt: "2026-06-21T12:00:00Z" }));
    const guardados = [];
    const errores = [];
    page.on("pageerror", error => errores.push(error.message));
    await page.route("https://res.cloudinary.com/**", ruta => ruta.abort());
    function paginar(registros, url, clave) {
        const limite = Number(url.searchParams.get("limite") || 10);
        const totalPaginas = Math.max(1, Math.ceil(registros.length / limite));
        const pagina = Math.min(Number(url.searchParams.get("pagina") || 1), totalPaginas);
        return { [clave]: registros.slice((pagina - 1) * limite, pagina * limite), paginacion: { pagina, limite, total: registros.length, totalPaginas } };
    }
    await page.route("**/api/**", async ruta => {
        const solicitud = ruta.request();
        const url = new URL(solicitud.url());
        const endpoint = url.pathname;
        let json = {}, status = 200;
        if (endpoint === "/api/health") json = { estado: "activo", baseDeDatos: "conectado" };
        else if (endpoint === "/api/auth/me") json = { usuario: { id: "prueba", nombre: "Prueba", rol, email: "prueba@example.test" } };
        else if (endpoint === "/api/catalog" && solicitud.method() === "GET") {
            const texto = (url.searchParams.get("busqueda") || "").toLowerCase();
            const categoria = url.searchParams.get("categoria");
            json = paginar(productos.filter(p => (!categoria || p.Categoria === categoria) && `${p.PLU} ${p.Producto} ${p.Departamento}`.toLowerCase().includes(texto)), url, "productos");
        } else if (endpoint === "/api/catalog" && solicitud.method() === "POST") {
            const datos = solicitud.postDataJSON();
            const indice = productos.findIndex(p => p._id === datos.id);
            if (productos.some(p => p.PLU === datos.PLU && p._id !== datos.id)) {
                status = 409; json = { mensaje: "El PLU ya pertenece a otro producto." };
            } else {
                productos[indice] = { ...productos[indice], ...datos };
                json = { producto: productos[indice], mensaje: "Producto guardado en inventario." };
            }
        } else if (endpoint === "/api/balances" && solicitud.method() === "GET") json = paginar(balances, url, "balances");
        else if (endpoint === "/api/balances" && solicitud.method() === "POST") {
            const datos = solicitud.postDataJSON(); guardados.push(datos);
            json = { balance: { ...datos, _id: datos.id || "nuevo" }, mensaje: "Balance guardado correctamente." };
        } else if (endpoint === "/api/reports") json = paginar(reportes, url, "reportes");
        else if (endpoint.startsWith("/api/reports/")) json = { reporte: { ...reportes[Number(endpoint.split("/").at(-1))], productos: [historico] } };
        else if (endpoint.endsWith("/sessions")) json = { sesiones: [] };
        else if (endpoint.endsWith("/activity")) json = { actividad: [] };
        await ruta.fulfill({ status, json });
    });
    return { guardados, errores };
}

async function navegar(page, vista) {
    const movil = await page.locator("#menuToggle").isVisible();
    if (movil) await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await page.locator(".sidebar-nav").getByRole("link", { name: vista, exact: true }).click();
    if (movil) await expect(page.locator("#menuToggle")).toHaveAttribute("aria-expanded", "false");
}

function planillaPrueba(tipo = "xlsx") {
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([
        ["Departamento", "PLU", "Producto", "Unidades Venta", "$ Venta PVP"],
        ["25 PANADERIA", "100", "PAN COTO 1 UNI", 5, 2500],
        ["28 PASTAS PROPIAS", "200", "FIDEOS 1 KGM", 2.5, 6000]
    ]), "Ventas");
    return XLSX.write(libro, { type: "buffer", bookType: tipo });
}

test("inicia sesion y abre inventario desde el menu", async ({ page }) => {
    const { errores } = await preparar(page);
    await page.route("**/api/auth/me", ruta => ruta.fulfill({ json: { usuario: null } }));
    await page.route("**/api/auth/login", ruta => {
        expect(ruta.request().postDataJSON()).toMatchObject({ email: "prueba@example.test", password: "Prueba123!" });
        return ruta.fulfill({ json: { usuario: { id: "prueba", nombre: "Prueba", rol: "admin" }, mensaje: "Sesion iniciada" } });
    });
    await page.goto("/#/cuenta");
    await page.getByLabel("Correo", { exact: true }).fill("prueba@example.test");
    await page.getByLabel("Contrasena", { exact: true }).fill("Prueba123!");
    await expect(page.getByRole("button", { name: "Iniciar sesion", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Iniciar sesion", exact: true }).click();
    await expect(page.getByRole("button", { name: "Generar ranking" })).toBeVisible();
    await navegar(page, "Inventario");
    await expect(page.locator(".catalog-table tbody tr")).toHaveCount(10);
    expect(errores).toEqual([]);
});

test("inventario pagina, busca y corrige PLU sin duplicar ni sobrescribir", async ({ page }) => {
    const { errores } = await preparar(page);
    await page.goto("/#/inventario");
    await expect(page.locator(".catalog-table tbody tr")).toHaveCount(10);
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    await expect(page.locator(".catalog-table tbody tr").first()).toContainText("110");
    await page.getByPlaceholder("Buscar por PLU, producto o departamento").fill("Producto 24");
    await expect(page.locator(".catalog-table tbody tr")).toHaveCount(1);
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByLabel("PLU", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Guardar producto", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("ya pertenece");
    await page.getByLabel("PLU", { exact: true }).fill("999");
    await page.getByRole("button", { name: "Guardar producto", exact: true }).click();
    await expect(page.locator(".catalog-table tbody tr")).toHaveCount(1);
    await expect(page.locator(".catalog-table tbody tr")).toContainText("999");
    await expect(page.locator(".catalog-table tbody tr")).not.toContainText("124");
    expect(errores).toEqual([]);
});

test("balance recupera el historial antiguo, conserva kg y valida cantidades", async ({ page }) => {
    const { guardados, errores } = await preparar(page);
    await page.goto("/#/balance");
    await expect(page.locator(".balance-table tbody tr")).toHaveCount(10);
    const historial = page.locator(".balance-page > .table-pagination").last();
    await historial.getByRole("button", { name: "5", exact: true }).click();
    await expect(page.locator(".balance-history-item")).toHaveCount(5);
    await page.locator(".balance-history-item").first().getByRole("button", { name: "Abrir", exact: true }).click();
    await expect(page.locator(".balance-table tbody tr")).toHaveCount(1);
    await expect(page.locator(".balance-table tbody tr")).toContainText("KG");
    const cantidad = page.getByLabel("Cantidad contada de Harina historica");
    await cantidad.fill("abc");
    await expect(cantidad).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Guardar balance", exact: true }).click();
    await expect(page.locator(".balance-message")).toContainText("PLU 100");
    expect(guardados).toHaveLength(0);
    await cantidad.fill("1,5");
    await page.getByRole("button", { name: "Guardar balance", exact: true }).click();
    await expect(page.locator(".balance-message")).toContainText("guardado correctamente");
    expect(guardados[0].productos[0]).toMatchObject({ UnidadMedida: "kg", Categoria: "materia-prima", CantidadContada: 1.5 });
    expect(errores).toEqual([]);
});

test("reportes permite abrir registros posteriores al numero 100", async ({ page }) => {
    const { errores } = await preparar(page);
    await page.goto("/#/reportes");
    await expect(page.locator(".report-item")).toHaveCount(10);
    await page.getByRole("button", { name: "11", exact: true }).click();
    await expect(page.locator(".report-item")).toHaveCount(5);
    await page.locator(".report-item").first().getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("heading", { name: "Reporte 100", exact: true })).toBeVisible();
    expect(errores).toEqual([]);
});

test("operador no puede abrir inventario ni ranking mediante la direccion", async ({ page }) => {
    await preparar(page, "operador");
    await page.goto("/#/inventario");
    await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();
    await page.goto("/#/ranking");
    await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();
});

test("carga Excel, muestra ranking y graficos y navega con el menu movil", async ({ page }) => {
    const { errores } = await preparar(page);
    await page.goto("/#/carga");
    await page.waitForFunction(() => Boolean(window.XLSX));
    await page.locator("#archivo").setInputFiles({ name: "prueba.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: planillaPrueba() });
    await page.getByRole("button", { name: "Generar ranking" }).click();
    await expect(page.getByRole("heading", { name: "Ranking de Productos", exact: true })).toBeVisible();
    await expect(page.locator("tbody").filter({ hasText: "PAN COTO" }).first()).toContainText("2.500");
    await navegar(page, "Graficos por departamento");
    await expect(page.locator(".department-bar-row")).toHaveCount(2);
    await page.getByRole("button", { name: "Cambiar a tema oscuro" }).click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);
    await expect(page.locator("body")).toHaveCSS("color-scheme", "dark");
    await expect(page.locator(".footer-brand-name")).toHaveText("VillamayorLabs");
    await page.getByLabel("Metrica del grafico").selectOption("kg");
    await expect(page.locator(".department-bar-row")).toHaveCount(1);
    expect(errores).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("graficos.png"), fullPage: true });
});

test("GitHub Pages carga desde subcarpeta sin publicar codigo interno", async ({ page, request }) => {
    const errores = [];
    page.on("pageerror", error => errores.push(error.message));
    await page.route("**/api/**", ruta => ruta.fulfill({ status: 404, json: { mensaje: "Sin backend" } }));
    await page.goto("/coto270/#/cuenta");
    await expect(page.getByRole("heading", { name: "Iniciar sesion", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Analizar archivo local", exact: true }).click();
    await expect(page.getByRole("button", { name: "Generar ranking" })).toBeVisible();
    await page.waitForFunction(() => Boolean(window.XLSX));
    await page.locator("#archivo").setInputFiles({ name: "prueba.ods", mimeType: "application/vnd.oasis.opendocument.spreadsheet", buffer: planillaPrueba("ods") });
    await page.getByRole("button", { name: "Generar ranking" }).click();
    await expect(page.getByRole("heading", { name: "Ranking de Productos", exact: true })).toBeVisible();
    const privado = await request.get("/coto270/server/app.js");
    expect(privado.status()).toBe(404);
    expect(errores).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("inicio.png"), fullPage: true });
});
