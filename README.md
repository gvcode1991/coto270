# Pulso de Ventas

Aplicacion web para analizar ventas de productos elaborados desde una planilla. La version 5 incorpora un backend opcional con Express y MongoDB sin quitar el funcionamiento local del navegador.

## Como usarla

1. Abrir la app desde un servidor local, Express o GitHub Pages.
2. Seleccionar una planilla `.xlsx`, `.xls` u `.ods`.
3. Presionar `Generar Ranking`.

La pagina lee la primera hoja del archivo, detecta departamentos, separa `PLU` y `Producto`, suma `UNI/KG` y `Venta Total`, y muestra rankings con filtros, ordenamiento y paginacion. Cuando la planilla incluye fechas diarias, permite consultar la semana completa o elegir un dia especifico.

Tambien genera un ranking por DTO. Cada tabla agrupa productos por departamento, muestra un resumen de unidades y kilos vendidos, y permite filtrar por texto, por tipo (`UNI` o `KG`) y ordenar por venta o producto.

La seccion `Graficos por departamento` compara ventas, unidades o kilos mediante barras horizontales. Los graficos se actualizan con el filtro de fecha seleccionado.

## Backend e historial

El backend es opcional. Sin MongoDB, la carga de archivos, los rankings, los filtros y los graficos continúan funcionando normalmente.

1. Copiar `.env.example` como `.env`.
2. Completar `MONGODB_URI` con la conexion de MongoDB Atlas.
3. Ejecutar `npm install`.
4. Ejecutar `npm start`.
5. Abrir `http://localhost:3000`.

Cuando MongoDB esta conectado aparece el boton `Guardar reporte`. Si se vuelve a guardar el mismo archivo para el mismo periodo, el registro se actualiza para evitar duplicados.

Endpoints iniciales:

- `GET /api/health`: estado del servidor y MongoDB.
- `GET /api/reports`: listado de reportes guardados.
- `GET /api/reports/:id`: detalle de un reporte.
- `POST /api/reports`: guarda o actualiza un reporte procesado.

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

La lectura de planillas usa SheetJS desde CDN. Si la pagina se abre sin conexion a internet y la libreria no esta en cache, se mostrara un mensaje indicando que no pudo cargarse.
