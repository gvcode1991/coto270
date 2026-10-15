import { test, expect } from "@playwright/test";
import * as XLSX from "xlsx";

async function preparar(page, rol = "admin") {
    let persona = { id: "prueba", nombre: "Prueba", apellido: "Usuario", legajo: "123", rol, email: "prueba@example.test" };
    let negocio = { nombre: "Elaborados", rubro: "otro", configurado: false };
    const productos = Array.from({ length: 25 }, (_, i) => ({
        _id: (i + 1).toString(16).padStart(24, "0"), PLU: String(100 + i),
        Producto: `Producto ${String(i).padStart(2, "0")}`, DTO: "25", Departamento: "Panaderia",
        UnidadMedida: "uni", Categoria: "producto-final", Activo: true
    }));
    const historico = { ...productos[0], Producto: "Harina historica", UnidadMedida: "kg", Categoria: "materia-prima", CantidadContada: 12.5 };
    const balances = Array.from({ length: 45 }, (_, i) => ({ _id: String(i), fecha: "2026-06-25", tipo: "cierre", estado: "contado", productos: [{ ...historico }] }));
    const reportes = Array.from({ length: 105 }, (_, i) => ({ _id: String(i), nombreArchivo: `Reporte ${i}`, periodo: { inicio: "2026-06-15", fin: "2026-06-21" }, resumen: { productos: 1, ventaTotal: 1234 }, updatedAt: "2026-06-21T12:00:00Z" }));
    const guardados = [];
    const usuarios = [
        { _id: "507f1f77bcf86cd799439011", nombre: "Administrador", email: "admin@example.test", rol: "admin", estado: "aprobado", activo: true },
        { _id: "507f1f77bcf86cd799439012", nombre: "Otro admin", email: "otro-admin@example.test", rol: "admin", estado: "aprobado", activo: true },
        { _id: "507f1f77bcf86cd799439013", nombre: "Operador", email: "operador@example.test", rol: "operador", estado: "aprobado", activo: true }
    ];
    const actividad = Array.from({ length: 125 }, (_, i) => ({ _id: String(i), tipo: `login_${i}`, usuario: { email: "operador@example.test" }, createdAt: "2026-10-14T12:00:00Z" }));
    const accionesAdmin = { eliminaciones: 0, limpiezas: 0 };
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
        else if (endpoint === "/api/auth/me" && solicitud.method() === "GET") json = { usuario: persona };
        else if (endpoint === "/api/auth/me" && solicitud.method() === "PATCH") {
            const { nombre, apellido, email, legajo } = solicitud.postDataJSON();
            persona = { ...persona, nombre, apellido, email, legajo };
            json = { usuario: persona, mensaje: "Tus datos se guardaron correctamente." };
        }
        else if (endpoint === "/api/business" && solicitud.method() === "GET") json = { negocio };
        else if (endpoint === "/api/business" && solicitud.method() === "PUT") {
            negocio = { ...solicitud.postDataJSON(), configurado: true };
            json = { negocio, mensaje: "Los datos de tu negocio se guardaron." };
        } else if (endpoint === "/api/admin/users" && solicitud.method() === "GET") json = { usuarios };
        else if (endpoint.startsWith("/api/admin/users/") && solicitud.method() === "DELETE") {
            const indice = usuarios.findIndex(item => item._id === endpoint.split("/").at(-1));
            usuarios.splice(indice, 1);
            accionesAdmin.eliminaciones += 1;
            json = { mensaje: "Usuario eliminado y sesiones cerradas." };
        } else if (endpoint === "/api/admin/activity" && solicitud.method() === "GET") json = paginar(actividad, url, "actividad");
        else if (endpoint === "/api/admin/activity" && solicitud.method() === "DELETE") {
            const eliminados = actividad.length;
            actividad.length = 0;
            accionesAdmin.limpiezas += 1;
            json = { mensaje: `Registros eliminados: ${eliminados}.`, eliminados };
        } else if (endpoint === "/api/catalog" && solicitud.method() === "GET") {
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
    return { guardados, errores, accionesAdmin };
}

async function navegar(page, vista) {
    const movil = await page.locator("#menuToggle").isVisible();
    if (movil) await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
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
    await page.getByLabel("Contraseña", { exact: true }).fill("Prueba123!");
    await expect(page.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(page.getByRole("button", { name: "Generar ranking" })).toBeVisible();
    await navegar(page, "Inventario");
    await expect(page.locator(".catalog-table tbody tr")).toHaveCount(10);
    expect(errores).toEqual([]);
});

test("mi cuenta permite editar los datos propios, cancelar y conservarlos al recargar", async ({ page }) => {
    const { errores } = await preparar(page, "operador");
    await page.goto("/#/cuenta");
    await page.getByRole("button", { name: "Editar mis datos", exact: true }).click();
    await page.getByLabel("Nombre", { exact: true }).fill("Cambio sin guardar");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.locator(".account-panel")).toContainText("Prueba");
    await page.getByRole("button", { name: "Editar mis datos", exact: true }).click();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Prueba");
    await page.getByLabel("Nombre", { exact: true }).fill("Gabriel");
    await page.getByLabel("Apellido", { exact: true }).fill("Villamayor");
    await page.getByLabel("Legajo (opcional)", { exact: true }).fill("456");
    await page.getByLabel("Correo", { exact: true }).fill("nuevo@example.test");
    await expect(page.getByLabel("Contraseña actual para cambiar el correo")).toBeVisible();
    await page.getByLabel("Contraseña actual para cambiar el correo").fill("Prueba123!");
    await page.screenshot({ path: test.info().outputPath("editar-perfil.png"), fullPage: true, scale: "css" });
    await page.getByRole("button", { name: "Guardar mis datos", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("se guardaron");
    await expect(page.locator(".account-panel")).toContainText("nuevo@example.test");
    await page.reload();
    await expect(page.locator(".account-panel")).toContainText("Gabriel");
    await expect(page.locator(".account-panel")).toContainText("456");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errores).toEqual([]);
});

test("mi cuenta conserva los datos anteriores cuando falla el guardado", async ({ page }) => {
    await preparar(page);
    await page.route("**/api/auth/me", async ruta => {
        if (ruta.request().method() !== "PATCH") return ruta.fallback();
        await ruta.fulfill({ status: 409, json: { mensaje: "Ya existe una cuenta con ese correo." } });
    });
    await page.goto("/#/cuenta");
    await page.getByRole("button", { name: "Editar mis datos", exact: true }).click();
    await page.getByLabel("Correo", { exact: true }).fill("ocupado@example.test");
    await page.getByLabel("Contraseña actual para cambiar el correo").fill("Prueba123!");
    await page.getByRole("button", { name: "Guardar mis datos", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Ya existe");
    await expect(page.locator(".account-panel")).toContainText("prueba@example.test");
    await expect(page.getByLabel("Contraseña actual para cambiar el correo")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Guardar mis datos", exact: true })).toBeEnabled();
});

test("configura el negocio, actualiza su identidad y persiste al recargar", async ({ page }) => {
    const { errores } = await preparar(page);
    await page.goto("/#/negocio");
    await expect(page.getByLabel("Nombre del comercio")).toHaveValue("Elaborados");
    await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeEnabled();
    await page.getByLabel("Nombre del comercio").fill("Almacén La Esquina");
    await page.getByLabel("Rubro", { exact: true }).selectOption("almacen");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("se guardaron");
    await expect(page.locator(".business-name")).toHaveText("Almacén La Esquina");
    await expect(page.locator(".workspace-identity")).toContainText("Almacén La Esquina");
    await page.reload();
    await expect(page.getByLabel("Nombre del comercio")).toHaveValue("Almacén La Esquina");
    await expect(page.getByLabel("Rubro", { exact: true })).toHaveValue("almacen");
    // Safari movil no incluye todos los enlaces en Tab por defecto; se comprueba su activacion.
    if (test.info().project.name === "ios") await page.locator(".skip-link").focus();
    else await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#contenido")).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("negocio-claro.png"), fullPage: true, scale: "css" });
    await page.getByRole("button", { name: "Cambiar a tema oscuro" }).click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);
    await page.screenshot({ path: test.info().outputPath("negocio-oscuro.png"), fullPage: true, scale: "css" });
    if (await page.locator("#menuToggle").isVisible()) {
        await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
        await expect(page.locator(".sidebar-nav").getByRole("link", { name: "Tu negocio", exact: true })).toBeVisible();
        await page.screenshot({ path: test.info().outputPath("menu-movil.png"), scale: "css" });
        await page.keyboard.press("Escape");
        await expect(page.locator("#menuToggle")).toHaveAttribute("aria-expanded", "false");
        await expect(page.locator("#menuToggle")).toBeFocused();
    }
    await navegar(page, "Inventario");
    await expect(page.locator(".catalog-table tbody tr")).toHaveCount(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("inventario-oscuro.png"), fullPage: true, scale: "css" });
    await navegar(page, "Cargar ventas");
    await page.getByRole("button", { name: "Cambiar a tema claro" }).click();
    await expect(page.locator("body")).toHaveClass(/theme-light/);
    await page.screenshot({ path: test.info().outputPath("carga-claro.png"), fullPage: true, scale: "css" });
    expect(errores).toEqual([]);
});

test("tu negocio rechaza nombre invalido y conserva la identidad cuando falla el guardado", async ({ page }) => {
    await preparar(page);
    await page.route("**/api/business", ruta => ruta.request().method() === "PUT"
        ? ruta.fulfill({ status: 500, json: { mensaje: "No se pudo guardar el negocio." } }) : ruta.fallback());
    await page.goto("/#/negocio");
    await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeEnabled();
    await page.getByLabel("Nombre del comercio").fill("   ");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("nombre de comercio");
    await page.getByLabel("Nombre del comercio").fill("Tienda Cambiada");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("No se pudo guardar");
    await expect(page.locator(".business-name")).toHaveText("Elaborados");
    await expect(page.getByText("Los datos de tu negocio se guardaron.", { exact: true })).toHaveCount(0);
});

test("fallo de lectura impide sobrescribir el negocio hasta reintentar", async ({ page }) => {
    await preparar(page);
    let fallar = true;
    await page.route("**/api/business", ruta => fallar
        ? ruta.fulfill({ status: 503, json: { mensaje: "Configuración temporalmente no disponible." } }) : ruta.fallback());
    await page.goto("/#/negocio");
    await expect(page.getByRole("alert")).toContainText("temporalmente");
    await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeDisabled();
    fallar = false;
    await page.getByRole("button", { name: "Volver a intentar" }).click();
    await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeEnabled();
});

test("gerente no tiene acceso de edicion a Tu negocio", async ({ page }) => {
    await preparar(page, "gerente");
    await page.goto("/#/negocio");
    await expect(page.getByRole("heading", { name: "Acceso restringido" })).toBeVisible();
    await expect(page.locator(".sidebar-nav a[href='#/negocio']")).toHaveCount(0);
    await expect(page.getByLabel("Nombre del comercio")).toHaveCount(0);
});

test("admin elimina usuarios no admin y limpia la actividad paginada con confirmacion", async ({ page }) => {
    const { accionesAdmin, errores } = await preparar(page);
    await page.goto("/#/admin");
    await expect(page.locator(".admin-user")).toHaveCount(3);
    await expect(page.getByRole("button", { name: /^Eliminar usuario/ })).toHaveCount(1);
    const borrar = page.getByRole("button", { name: "Eliminar usuario operador@example.test", exact: true });
    page.once("dialog", dialogo => dialogo.dismiss());
    await borrar.click();
    expect(accionesAdmin.eliminaciones).toBe(0);
    page.once("dialog", dialogo => dialogo.accept());
    await borrar.click();
    await expect(page.locator(".admin-user")).toHaveCount(2);
    expect(accionesAdmin.eliminaciones).toBe(1);
    await expect(page.getByRole("button", { name: /^Eliminar usuario/ })).toHaveCount(0);
    const lista = page.locator(".admin-activity .activity-item");
    await expect(lista).toHaveCount(10);
    await page.locator(".admin-activity").getByRole("button", { name: "13", exact: true }).click();
    await expect(lista).toHaveCount(5);
    await expect(lista.first()).toContainText("login 120");
    const limpiar = page.getByRole("button", { name: "Limpiar registros", exact: true });
    page.once("dialog", dialogo => dialogo.dismiss());
    await limpiar.click();
    expect(accionesAdmin.limpiezas).toBe(0);
    page.once("dialog", dialogo => dialogo.accept());
    await limpiar.click();
    await expect(page.getByText("No hay registros de actividad.", { exact: true })).toBeVisible();
    await expect(limpiar).toBeDisabled();
    expect(accionesAdmin.limpiezas).toBe(1);
    expect(errores).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("administracion.png"), fullPage: true, scale: "css" });
});

test("gerente consulta actividad paginada sin opciones de eliminar o limpiar", async ({ page }) => {
    const { errores } = await preparar(page, "gerente");
    await page.goto("/#/admin");
    await expect(page.locator(".admin-user")).toHaveCount(3);
    await expect(page.getByRole("button", { name: /^Eliminar usuario/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Limpiar registros", exact: true })).toHaveCount(0);
    await expect(page.locator(".admin-activity .activity-item")).toHaveCount(10);
    await page.getByRole("button", { name: "13", exact: true }).click();
    await expect(page.locator(".admin-activity .activity-item")).toHaveCount(5);
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
    await expect(page.getByRole("heading", { name: "Ranking de productos", exact: true })).toBeVisible();
    await expect(page.locator("tbody").filter({ hasText: "PAN COTO" }).first()).toContainText("2.500");
    if (await page.locator("#menuToggle").isVisible()) await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    await page.locator(".sidebar-dropdown summary").click();
    await page.locator(".sidebar-subnav").getByRole("link", { name: "PANADERIA", exact: true }).click();
    await expect(page.getByRole("heading", { name: "PANADERIA", exact: true })).toBeVisible();
    await navegar(page, "Gráficos por departamento");
    await expect(page.locator(".department-bar-row")).toHaveCount(2);
    await page.getByRole("button", { name: "Cambiar a tema oscuro" }).click();
    await expect(page.locator("body")).toHaveClass(/theme-dark/);
    await expect(page.locator("body")).toHaveCSS("color-scheme", "dark");
    await expect(page.locator(".footer-brand-name")).toHaveText("VillamayorLabs");
    await page.getByLabel("Métrica del gráfico").selectOption("kg");
    await expect(page.locator(".department-bar-row")).toHaveCount(1);
    expect(errores).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("graficos.png"), fullPage: true, scale: "css" });
});

test("GitHub Pages carga desde subcarpeta sin publicar codigo interno", async ({ page, request }) => {
    const errores = [];
    page.on("pageerror", error => errores.push(error.message));
    await page.route("**/api/**", ruta => ruta.fulfill({ status: 404, json: { mensaje: "Sin backend" } }));
    await page.goto("/coto270/#/cuenta");
    await expect(page.getByRole("heading", { name: "Iniciar sesión", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Analizar archivo local", exact: true }).click();
    await expect(page.getByRole("button", { name: "Generar ranking" })).toBeVisible();
    await page.waitForFunction(() => Boolean(window.XLSX));
    await page.locator("#archivo").setInputFiles({ name: "prueba.ods", mimeType: "application/vnd.oasis.opendocument.spreadsheet", buffer: planillaPrueba("ods") });
    await page.getByRole("button", { name: "Generar ranking" }).click();
    await expect(page.getByRole("heading", { name: "Ranking de productos", exact: true })).toBeVisible();
    const privado = await request.get("/coto270/server/app.js");
    expect(privado.status()).toBe(404);
    expect(errores).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("inicio.png"), fullPage: true, scale: "css" });
});
