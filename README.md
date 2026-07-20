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

La vista `Cuenta` permite registrar usuarios, iniciar sesion y cerrarla. Las contrasenas nuevas se protegen con `bcrypt`; los hashes antiguos con `scrypt` se migran al iniciar sesion. Las sesiones se almacenan en MongoDB mediante una cookie privada `httpOnly`. El analisis local sigue disponible sin cuenta, pero guardar reportes o balances requiere una sesion activa. Si Resend esta configurado, el usuario puede pedir que el codigo de recuperacion llegue a su correo registrado.

## Backend e historial

El backend es opcional. Sin MongoDB, la carga de archivos, los rankings, los filtros y los graficos continuan funcionando normalmente.

1. Crear un archivo privado `.env` en la carpeta principal.
2. Agregar las variables `PORT`, `MONGODB_URI`, `MONGODB_DB_NAME` y `CLIENT_ORIGIN`.
3. Para sesiones, agregar `SESSION_COOKIE_NAME`, `SESSION_COOKIE_SECURE` y `SESSION_COOKIE_SAME_SITE`.
4. Para recuperacion por email con Resend, agregar `RESEND_API_KEY` y `RESEND_FROM_EMAIL`.
5. Ejecutar `npm install`.
6. Ejecutar `npm start`.
7. Abrir `http://localhost:3000`.

Los archivos `.env*` estan excluidos de Git y nunca deben subirse al repositorio.

## Publicacion en Render

El archivo `render.yaml` prepara un Web Service que publica React y Express bajo el mismo dominio. Render utiliza la rama `prod`, ejecuta `npm install`, inicia con `npm start` y comprueba el servicio mediante `/api/health`.

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

## Estructura

- `index.html`: pantalla principal de la aplicacion.
- `src/main.js`: punto de entrada de React.
- `src/PulsoApp.js`: estado principal de la aplicacion.
- `src/components/`: componentes visuales de menu, carga, tablas, resumen y paginacion.
- `src/lib/`: lectura de planillas, reglas de producto, formatos y utilidades.
- `src/constants.js`: version, paginacion y columnas base.
- `src/styles.css`: estilos de layout, tablas, menu lateral y mobile.
- `assets/images/`: logos e iconos de Pulso de Ventas.
- `server/`: API Express, conexion con MongoDB y persistencia de reportes.

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
