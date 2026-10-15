# Pulso de Ventas

Aplicacion web para analizar ventas de productos elaborados desde una planilla. La version 5 incorpora un backend opcional con Express y MongoDB sin quitar el funcionamiento local del navegador.

## Licencia

Pulso de Ventas es software privado y propietario. Todos los derechos estan reservados por Gabriel Villamayor. No esta permitido copiar, modificar, distribuir, publicar, alojar, vender ni reutilizar este proyecto sin autorizacion previa y por escrito.

## Como usarla

1. Abrir la app desde un servidor local, Express, Render o GitHub Pages.
2. Seleccionar una planilla `.xlsx`, `.xls` u `.ods`.
3. Presionar `Generar Ranking`.

La pagina lee la primera hoja del archivo, detecta departamentos, separa `PLU` y `Producto`, suma `UNI/KG` y `Venta Total`, y muestra rankings con filtros, ordenamiento y paginacion. Cuando la planilla incluye fechas diarias, permite consultar la semana completa o elegir un dia especifico.

Tambien genera un ranking por DTO. Cada tabla agrupa productos por departamento, muestra un resumen de unidades y kilos vendidos, y permite filtrar por texto, por tipo (`UNI` o `KG`) y ordenar por venta o producto.

La seccion `Graficos por departamento` compara ventas, unidades o kilos mediante barras horizontales. Los graficos se actualizan con el filtro de fecha seleccionado.

El menu utiliza vistas separadas para carga, ranking, graficos y cada departamento. La navegacion funciona con los botones atras y adelante del navegador y es compatible con GitHub Pages.

La vista `Balance` permite preparar los dos parciales y el cierre mensual. Cada producto queda identificado por PLU, departamento y tipo de conteo (`UNI` o `KG`), con una cantidad contada opcional y persistencia en MongoDB.

La vista `Inventario` guarda productos finales y materias primas con PLU, departamento, tipo de conteo y categoria. Balance usa este inventario para autocompletar datos y reducir errores de carga.

El alta de un producto rechaza un PLU existente. La edicion envia su identificador interno (`id`) para actualizar el mismo registro, incluso al corregir su PLU. Un PLU ocupado responde con 409 y un registro eliminado responde con 404, sin crearlo nuevamente. Los balances historicos conservan los PLU registrados originalmente. `npm run test:catalog` verifica estas reglas con persistencia simulada.

La importacion del 270 agrega solamente PLU nuevos. Los productos existentes conservan nombre, departamento, medida, categoria, estado activo/inactivo y fechas de registro. Para modificar esos datos se utiliza el ABM. Las filas repetidas se agrupan por PLU y el resultado informa los productos nuevos, existentes conservados y duplicados. Reimportar el mismo reporte no modifica el inventario existente.
La vista `Balance` toma los productos activos desde Inventario, permite cargar cantidades contadas por producto, guardar el balance y volver a abrirlo para consultar o modificar el conteo.

Al abrir un balance guardado se conservan sus productos, nombres, medidas, departamentos, categorias y cantidades originales. La accion `Agregar productos del inventario` incorpora solo los PLU nuevos, sin reemplazar ni quitar filas existentes. Los cambios se registran al guardar el balance. Los balances nuevos toman los datos actuales del inventario.

La prueba `npm run test:balances` verifica la conservacion del historico, la incorporacion de productos y la edicion de cantidades con persistencia simulada, sin conectarse a MongoDB.

Las cantidades de balance aceptan coma o punto como separador decimal, sin separadores de miles. Los productos por unidad requieren numeros enteros y los productos por kg permiten decimales. Un campo vacio representa un conteo pendiente; cero representa un conteo realizado sin existencias. Tanto la pantalla como la API rechazan cantidades negativas, invalidas o fuera de rango antes de guardar.

La vista `Cuenta` permite registrar usuarios, iniciar sesion y cerrarla. Las contrasenas nuevas se protegen con `bcrypt`; los hashes antiguos con `scrypt` se migran al iniciar sesion. Las sesiones se almacenan en MongoDB mediante una cookie privada `httpOnly`. El analisis local sigue disponible sin cuenta, pero guardar reportes o balances requiere una sesion activa. Si Resend esta configurado, el usuario puede pedir que el codigo de recuperacion llegue a su correo registrado.

## Backend e historial

El backend es opcional. Sin MongoDB, la carga de archivos, los rankings, los filtros y los graficos continuan funcionando normalmente.

1. Crear un archivo privado `.env` en la carpeta principal.
2. Agregar las variables `PORT`, `MONGODB_URI`, `MONGODB_DB_NAME` y `CLIENT_ORIGIN`.
3. Para sesiones, agregar `SESSION_COOKIE_NAME`, `SESSION_COOKIE_SECURE` y `SESSION_COOKIE_SAME_SITE`.
4. Para recuperacion por email con Resend, agregar `RESEND_API_KEY` y `RESEND_FROM_EMAIL`.
5. Activar Corepack con `corepack enable` e instalar con `pnpm install --frozen-lockfile`.
6. Ejecutar `pnpm start`.
7. Abrir `http://localhost:3000`.

Los archivos `.env*` estan excluidos de Git y nunca deben subirse al repositorio.

## Publicacion en Render

El archivo `render.yaml` prepara un Web Service que publica React y Express bajo el mismo dominio. Render utiliza la rama `prod`, instala las dependencias de produccion con el archivo de versiones de pnpm, inicia con `npm start` y comprueba el servicio mediante `/api/health`.

1. Trabajar los cambios nuevos en `dev`.
2. Cuando el cambio este probado, mergear `dev` hacia `prod`.
3. Render despliega automaticamente desde `prod`.
4. Cuando `prod` funcione bien, mergear `prod` hacia `main` para dejar el historial estable actualizado.
5. En Render seleccionar `New > Blueprint`.
6. Conectar el repositorio `gvcode1991/coto270`.
7. Confirmar el Blueprint detectado desde `render.yaml`.
8. Cargar `MONGODB_URI` como variable privada cuando Render la solicite.
9. Crear el servicio y esperar que el estado indique `Live`.
10. En MongoDB Atlas autorizar las direcciones de salida indicadas por Render en la configuracion de red del servicio.

Las cookies se configuran como seguras en Render y las credenciales de MongoDB no se guardan en Git.

Cuando MongoDB esta conectado aparece el boton `Guardar reporte`. Si se vuelve a guardar el mismo archivo para el mismo periodo, el registro se actualiza para evitar duplicados.

## Endpoints

Administracion permite eliminar usuarios excepto cuentas con rol admin (tambien protege la cuenta propia), revocando sus sesiones y conservando reportes y balances. La actividad global se consulta en paginas de 10 registros. Solo un administrador puede eliminar cuentas o limpiar todos los registros; ambas acciones solicitan confirmacion. La limpieza afecta tambien al historial de actividad de las cuentas, sin modificar usuarios, sesiones ni datos comerciales.

Los listados de inventario, balances y reportes aceptan `pagina` y `limite` (10 por defecto, maximo 100). La respuesta incluye la lista correspondiente y `paginacion: { pagina, limite, total, totalPaginas }`. Inventario admite ademas `busqueda`, `categoria` y `activo`. La pantalla de Balance recorre todas las paginas del inventario al preparar un conteo.

- `GET /api/health`: estado del servidor y MongoDB.
- `GET /api/reports`: listado de reportes guardados.
- `GET /api/reports/:id`: detalle de un reporte.
- `POST /api/reports`: guarda o actualiza un reporte procesado.
- `POST /api/auth/register`: crea una cuenta.
- `POST /api/auth/login`: inicia una sesion.
- `POST /api/auth/recovery-code/email`: envia un codigo de recuperacion por Resend.
- `GET /api/auth/me`: devuelve el usuario de la sesion.
- `POST /api/auth/logout`: cierra y revoca la sesion.
- `GET /api/balances`: listado de balances mensuales.
- `POST /api/balances`: crea o actualiza un balance.
- `DELETE /api/balances/:id`: elimina un balance.
- `GET /api/catalog`: listado del inventario.
- `POST /api/catalog`: crea o actualiza un producto del inventario.
- `POST /api/catalog/import`: importa productos desde un reporte cargado.
- `DELETE /api/catalog/:plu`: elimina un producto del inventario.
- `DELETE /api/admin/users/:id`: elimina una cuenta que no sea admin y sus sesiones.
- `GET /api/admin/activity?pagina=1&limite=10`: actividad global paginada (admin y gerente).
- `DELETE /api/admin/activity`: limpia todos los registros de actividad (solo admin).

## Estructura

Express publica unicamente el inicio (`/` e `/index.html`), los recursos de `/src` y `/assets`, y las tres librerias declaradas en `/vendor`. Los archivos internos y las rutas desconocidas responden con 404. La navegacion de la app utiliza el fragmento `#/` y no necesita una ruta de respaldo en el servidor.

- `index.html`: pantalla principal de la aplicacion.
- `src/main.js`: punto de entrada de React.
- `src/PulsoApp.js`: estado principal de la aplicacion.
- `src/components/`: componentes visuales de menu, carga, tablas, resumen y paginacion.
- `src/lib/`: lectura de planillas, reglas de producto, formatos y utilidades.
- `src/constants.js`: version, paginacion y columnas base.
- `src/styles.css`: estilos de layout, tablas, menu lateral y mobile.
- `assets/images/`: logos e iconos de Pulso de Ventas.
- `server/`: API Express, conexion con MongoDB y persistencia de reportes.
- `server/lib/pagination.js`: paginacion comun de los listados.
- `src/lib/roles.js`: permisos compartidos por la interfaz y la API.
- `tests/`: pruebas de navegador con respuestas de API simuladas.
- `scripts/`: verificaciones, pruebas de logica y generacion del sitio estatico.

## GitHub Pages

`pnpm run build:pages` genera `dist/` con el inicio, `src`, `assets` y las librerias de React y SheetJS. No copia codigo del servidor, archivos de configuracion ni dependencias privadas. Las rutas relativas permiten publicar en `/coto270/`.

El workflow de Pages publica solamente desde `prod`. La version estatica permite analizar archivos en el dispositivo mediante `Analizar archivo local`; las cuentas, el inventario y el historial persistente se utilizan en Render. Los archivos analizados localmente no se envian al servidor hasta una accion explicita de guardado con sesion y permisos.

## Verificacion

- `pnpm run check`: sintaxis de aplicacion, servidor, scripts y pruebas.
- `pnpm test`: logica de balances, cantidades, inventario, importacion, paginacion y permisos, sin MongoDB.
- `pnpm run test:server`: API sin base de datos, recursos publicos y bloqueo de archivos internos.
- `pnpm exec playwright install chromium webkit`: prepara los navegadores de prueba.
- `pnpm run build:pages` y `pnpm run test:ui`: pruebas en escritorio y emulacion movil Android/iPhone con Chromium/WebKit, incluyendo la version estatica en subcarpeta. Usan datos simulados y no cargan `.env`.
- `pnpm run test:security`: prueba opcional con MongoDB, en una base temporal independiente. No forma parte de `pnpm test`.

El workflow `Verificar aplicacion` ejecuta las comprobaciones automaticas al recibir cambios y propuestas hacia `dev`, `prod` o `main`. Un resultado aprobado no reemplaza la validacion con datos reales en el servicio de desarrollo antes del merge a produccion.

Antes de pasar a `prod`, validar en el servicio de desarrollo: inicio y cierre de sesion con cada rol; carga de un 270 conocido comparando sus totales con la planilla; alta, edicion e importacion del inventario; guardado y reapertura de un balance de prueba; consulta de las ultimas paginas del historial; navegacion desde dispositivos iOS y Android reales. La recuperacion de cuenta con correo se prueba alli con una cuenta de prueba. Luego repetir las comprobaciones en `prod` antes de actualizar `main`.

## Flujo de ramas

- `dev`: desarrollo diario y pruebas iniciales.
- `prod`: codigo estable que se publica en Render y GitHub Pages.
- `main`: version final/historica. Se actualiza solamente despues de validar que `prod` funciona correctamente.

Flujo recomendado:

1. Crear cambios en `dev`.
2. Probar localmente y revisar que no haya errores en mobile.
3. Mergear `dev` hacia `prod`.
4. Esperar el deploy de Render y validar la app publicada.
5. Mergear `prod` hacia `main` solo cuando la version publicada este estable.

## Formato esperado

La planilla debe tener datos de departamento, producto, unidades/kilos vendidos y venta. El `PLU` puede venir en una columna propia o al inicio del texto de producto.

Si existen encabezados `DTO`, `Departamento`, `Producto`, `UNI/KG` y `Venta Total`, la app los detecta automaticamente. Si no los encuentra, usa el formato historico:

- DTO: columna A
- Departamento: columna B
- Producto: columna C, con el PLU al inicio del texto
- UNI/KG: columnas D, F, H, J, L, N y P
- Venta Total: columnas E, G, I, K, M, O y Q

Los importes pueden venir como numero, con signo `$`, con separadores argentinos como `1.234,56`, o con separadores internacionales como `1,234.56`.

## Notas

La lectura de planillas usa SheetJS servido por la propia app desde `/vendor`, para evitar dependencias externas durante la carga inicial. Si la libreria no esta disponible, se mostrara un mensaje indicando que no pudo cargarse.
